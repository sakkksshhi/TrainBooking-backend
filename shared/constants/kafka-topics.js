const KAFKA_TOPICS = {
    STATION_CREATED: 'admin.station.created',
    TRAIN_CREATED: 'admin.train.created',
    ROUTE_CREATED: 'admin.route.created',
    SCHEDULE_CREATED: 'admin.schedule.created',
    SCHEDULE_CANCELLED: 'admin.schedule.cancelled',
    SEAT_AVAILABILITY_UPDATED: 'admin.seat.availability.updated',
    DLQ_SEARCH: 'search.dlq',
    DLQ_INVENTORY: 'inventory.dlq',
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    DLQ_BOOKING: 'booking.dlq',
};
const DLQ_MAX_RETRIES = 3;

module.exports = { KAFKA_TOPICS, DLQ_MAX_RETRIES };