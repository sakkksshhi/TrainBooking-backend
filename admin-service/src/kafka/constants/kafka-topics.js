const KAFKA_TOPICS = {
    STATION_CREATED: 'admin.station.created',
    TRAIN_CREATED: 'admin.train.created',
    ROUTE_CREATED: 'admin.route.created',
    SCHEDULE_CREATED: 'admin.schedule.created',
    SCHEDULE_CANCELLED: 'admin.schedule.cancelled',
    SEAT_AVAILABILITY_UPDATED: 'admin.seat.availability.updated',
    DLQ_SEARCH: 'search.dlq',
};

module.exports = { KAFKA_TOPICS };