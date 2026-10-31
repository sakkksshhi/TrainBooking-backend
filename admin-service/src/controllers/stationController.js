const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError } = require('../utils/error')
const stationService = require('../services/station.service');


exports.createStation = asyncHandler(async (req, res) => {
     const { name, code, city, state } = req.body;

     if (!name || !code || !city || !state) {
          throw new BadRequestError('code, name, city and state are required');
     }

     const station = await stationService.createStation({
          code: code.toUpperCase(),
          name,
          city,
          state
     });

     res.status(201).json({
          success: true,
          message: 'Station Created Successfully',
          data: station
     })
})


exports.getAllStations = asyncHandler(async (req, res) => {
     const page = Number(req.query.page ?? 1);
     const limit = Number(req.query.limit ?? 50);
     const search = req.query.search;

     if (!Number.isInteger(page) || page < 1) {
         throw new BadRequestError('Page must be a positive integer');
     }

     if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
         throw new BadRequestError('Limit must be between 1 and 100');
     }

     const result = await stationService.getAllStations(page, limit, search);

     res.status(200).json({
          success: true,
          data: result.stations,
          pagination: {
               page,
               limit,
               total: result.total,
               totalPages: Math.ceil(result.total / limit)
          }
     });
});

exports.getStationById = asyncHandler(async (req, res) => {
     const { stationId } = req.params;
     if(!stationId){
          throw new BadRequestError("Station Id is missing");
     }
     const station = await stationService.getStationById(stationId);

     res.status(200).json({
          success: true,
          data: station
     });
});

exports.getStationByIdInternal = asyncHandler(async (req, res) => {
     const { stationId } = req.params;
     if(!stationId){
          throw new BadRequestError("Station Id is missing");
     }
     const station = await stationService.getStationById(stationId);

     res.status(200).json({
          success: true,
          data:{
               id: station.id,
               name: station.name,
               code: station.code,
          }
     });
});