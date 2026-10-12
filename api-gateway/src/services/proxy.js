const axios = require('axios');
const { config } = require('../config');
const {
    ServiceUnavailableError,
    GatewayTimeoutError
} = require('../utils/error');
const logger = require('../config/logger');

/**
 * Circuit Breaker
 * States: CLOSED, OPEN, HALF_OPEN
 */
class CircuitBreaker {
    constructor(
        serviceName,
        threshold = config.CIRCUIT_BREAKER_THRESHOLD,
        timeout = config.CIRCUIT_BREAKER_TIMEOUT
    ) {
        this.serviceName = serviceName;
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED';
        this.nextAttempt = 0;
        this.halfOpenInFlight = false;
    }

    async execute(request) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new ServiceUnavailableError(
                    `Service ${this.serviceName} is temporarily unavailable.`
                );
            }

            this.state = 'HALF_OPEN';
            this.halfOpenInFlight = false;

            logger.info(`Circuit breaker HALF_OPEN for ${this.serviceName}`);
        }

        if (this.state === 'HALF_OPEN') {
            if (this.halfOpenInFlight) {
                throw new ServiceUnavailableError(
                    `Service ${this.serviceName} is being tested for recovery.`
                );
            }

            this.halfOpenInFlight = true;
        }

        try {
            const response = await request();

            // Axios is configured to return HTTP error statuses as responses.
            // Count only network/server failures, not ordinary 4xx responses.
            if (response.status >= 500) {
                this.onFailure();
            } else {
                this.onSuccess();
            }

            return response;
        } catch (err) {
            this.onFailure();
            throw err;
        } finally {
            if (this.state === 'HALF_OPEN') {
                this.halfOpenInFlight = false;
            }
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
        this.halfOpenInFlight = false;
        this.nextAttempt = 0;
    }

    onFailure() {
        this.failureCount++;

        if (
            this.state === 'HALF_OPEN' ||
            this.failureCount >= this.threshold
        ) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            this.halfOpenInFlight = false;

            logger.error(
                `Circuit breaker OPEN for ${this.serviceName}. Retry after ${new Date(this.nextAttempt).toISOString()}`
            );
        }
    }

    getState() {
        return {
            service: this.serviceName,
            state: this.state,
            failureCount: this.failureCount,
            nextAttempt:
                this.state === 'OPEN'
                    ? new Date(this.nextAttempt).toISOString()
                    : null
        };
    }
}

const circuitBreakers = {
    userService: new CircuitBreaker('user-service'),
    searchService: new CircuitBreaker('search-service'),
    adminService: new CircuitBreaker('admin-service'),
    notificationService: new CircuitBreaker('notification-service'),
    bookingService: new CircuitBreaker('booking-service'),
    paymentService: new CircuitBreaker('payment-service'),
    inventoryService: new CircuitBreaker('inventory-service')
};

/**
 * Forward a request to a downstream service.
 */
async function forwardRequest(
    serviceUrl,
    path,
    method,
    data,
    headers,
    circuitBreaker
) {
    const url = `${serviceUrl}${path}`;

    // Do not forward hop-by-hop or client-controlled routing headers.
    const forwardedHeaders = { ...headers };

    [
        'host',
        'connection',
        'keep-alive',
        'transfer-encoding',
        'content-length',
        'x-user-id'
    ].forEach(header => {
        delete forwardedHeaders[header];
    });

    // Only send the authenticated identity supplied by the gateway.
    if (headers['x-gateway-user-id']) {
        forwardedHeaders['x-user-id'] = headers['x-gateway-user-id'];
    }

    logger.debug(`Forwarding ${method} request to ${serviceUrl}`, {
        path,
        hasData: data !== undefined,
        timeout: config.SERVICE_TIMEOUT_MS
    });

    const requestConfig = {
        method,
        url,
        timeout: config.SERVICE_TIMEOUT_MS,
        headers: forwardedHeaders,
        validateStatus: () => true,
        maxRedirects: 0
    };

    if (method !== 'GET' && method !== 'HEAD' && data !== undefined) {
        requestConfig.data = data;
    }

    if (
        (method === 'GET' || method === 'HEAD' || method === 'DELETE') &&
        data
    ) {
        requestConfig.params = data;
    }

    try {
        const response = await circuitBreaker.execute(
            () => axios(requestConfig)
        );

        return {
            status: response.status,
            data: response.data,
            headers: response.headers
        };
    } catch (err) {
        logger.error(`Error forwarding request to ${serviceUrl}`, {
            message: err.message,
            code: err.code,
            method,
            path,
            timeout: config.SERVICE_TIMEOUT_MS
        });

        if (
            err.code === 'ECONNABORTED' ||
            err.code === 'ETIMEDOUT'
        ) {
            throw new GatewayTimeoutError(
                `Request to ${serviceUrl} timed out after ${config.SERVICE_TIMEOUT_MS}ms`
            );
        }

        if (
            err.code === 'ECONNREFUSED' ||
            err.code === 'ENOTFOUND' ||
            err.code === 'EHOSTUNREACH'
        ) {
            throw new ServiceUnavailableError(
                `Cannot connect to ${serviceUrl}. The service may be unavailable.`
            );
        }

        throw new ServiceUnavailableError(
            'The downstream service is temporarily unavailable.'
        );
    }
}

/**
 * Proxy middleware factory.
 */

function createProxy(serviceName, serviceUrl) {
    const circuitBreaker = circuitBreakers[serviceName];

    if (!circuitBreaker) {
        throw new Error(
            `No circuit breaker found for service: ${serviceName}`
        );
    }

    return async (req, res, next) => {
        try {
            // Gateway routes are mounted under /api.
            // /api/users/auth/login -> /api/auth/login
            // /api/search/trains -> /trains
            const pathParts = req.path.split('/').filter(Boolean);

            
let servicePath;

if (serviceName === 'userService') {
    const relativePath = pathParts.slice(1).join('/');

    if (relativePath === 'profile') {
        servicePath = '/api/users/profile';
    } else {
        servicePath = '/api/' + relativePath;
    }
} else {
    servicePath = '/' + pathParts.slice(1).join('/');
}


            const queryString = new URL(
                req.originalUrl,
                'http://localhost'
            ).search;

            const targetPath = servicePath + queryString;

            console.log({
                serviceName,
                originalUrl: req.originalUrl,
                path: req.path,
                servicePath,
                targetPath
            });

            // Never trust a client-supplied user ID.
            const headers = { ...req.headers };

            delete headers['x-user-id'];
            delete headers['x-gateway-user-id'];

            if (req.user && req.user.id) {
                headers['x-gateway-user-id'] = String(req.user.id);
            }

            const result = await forwardRequest(
                serviceUrl,
                targetPath,
                req.method,
                req.body,
                headers,
                circuitBreaker
            );

            const excludedResponseHeaders = [
                'connection',
                'keep-alive',
                'transfer-encoding',
                'host',
                'content-length'
            ];

            Object.entries(result.headers || {}).forEach(([key, value]) => {
                if (!excludedResponseHeaders.includes(key.toLowerCase())) {
                    res.setHeader(key, value);
                }
            });

            // Preserve empty responses, such as HTTP 204 and 304.
            if (result.status === 204 || result.status === 304) {
                return res.status(result.status).end();
            }

            if (result.data === undefined || result.data === null) {
                return res.status(result.status).end();
            }

            // Preserve binary responses.
            if (Buffer.isBuffer(result.data)) {
                return res.status(result.status).send(result.data);
            }

            return res.status(result.status).send(result.data);
        } catch (err) {
            next(err);
        }
    };
}

function getCircuitBreakerStatus() {
    return Object.values(circuitBreakers).map(cb => cb.getState());
}

module.exports = {
    createProxy,
    CircuitBreaker,
    circuitBreakers,
    getCircuitBreakerStatus
};