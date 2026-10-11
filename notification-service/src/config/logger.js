const log = (level) => (message, meta) => {
    const line = `${new Date().toISOString()} [notification-service] ${level}: ${message}`;
    if (meta) {
        console[level === 'error' ? 'error' : 'log'](line, meta);
    } else {
        console[level === 'error' ? 'error' : 'log'](line);
    }
};

module.exports = {
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
};