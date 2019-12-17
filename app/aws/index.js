var AWS = require('aws-sdk');
var logger = require('../logger');
var config = require('../config');
var awsConfig = config.getAWSConfig();

//get all cost of a day
var getAllCostDaily = async function() {

    //get timerage between today and last day
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost']
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })

}

//get all regions
var getRegions = async function () {

    return new Promise(async (resolve, reject) => {

        AWS.config = new AWS.Config();
        AWS.config.region = awsConfig.region;
        AWS.config.accessKeyId = awsConfig.accessKeyId;
        AWS.config.secretAccessKey = awsConfig.secretAccessKey;

        var regions = new AWS.EC2
        regions.describeRegions('', function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}

//get regions, where cost for last month was not null
var getActiveRegions = async function () {
    var activeRegions = []
    return new Promise(async (resolve, reject) => {
        try {
            var allRegionsArr = await getRegions();
            for (var i = 0; i < allRegionsArr.Regions.length; i++) {
                var region = allRegionsArr.Regions[i]
                var actRegion = await checkRegionCost(region.RegionName);
                if (actRegion.amount > 0) {
                    activeRegions.push(actRegion);
                }
            }
            resolve(activeRegions);
        }
        catch (err) {
            return reject(err)
        }

    })
}

//get all services, where monthly cost was not null
var getActiveServices = async function () {

    return new Promise(async (resolve, reject) => {
        try {
            var allServices = await getServices();
            resolve(allServices);
        }
        catch (err) {
            reject(err)
        }



    })
}

// //get cost in region last month
var checkRegionCost = async function (regionName) {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) + '-01')

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        Filter: {
            "Dimensions": {
                "Key": "REGION",
                "Values": [regionName]
            }
        }
    };
    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);

            resolve({
                'region': regionName,
                'amount': output.ResultsByTime[0].Total.UnblendedCost.Amount,
                'unit': output.ResultsByTime[0].Total.UnblendedCost.Unit
            });
        }
        catch (err) {
            reject(err);
        }
    })
}

//get services, where cost in last month was not null
var getServices = function () {
    var date = new Date();
    var todayDate = (date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate()))
    var firstDayMonthDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) + '-01'

    var params = {
        TimePeriod: { /* required */
            "Start": firstDayMonthDate,
            "End": todayDate
        },
        "Dimension": "Service"
    };

    AWS.config = new AWS.Config();
    AWS.config.region = awsConfig.region;
    AWS.config.accessKeyId = awsConfig.accessKeyId;
    AWS.config.secretAccessKey = awsConfig.secretAccessKey;

    var costexplorer = new AWS.CostExplorer();
    return new Promise((resolve, reject) => {
        costexplorer.getDimensionValues(params, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })

}

//get cost of last day of certain region
var getCostPerRegionDaily = function (regionName) {
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        Filter: {
            "Dimensions": {
                "Key": "REGION",
                "Values": [regionName]
            }
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//get cost of last day for certain service
var getCostPerServiceDaily = function (service) {

    var days = 1;

    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        Filter: {
            "Dimensions": {
                "Key": "SERVICE",
                "Values": [service]
            }
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//get cost of region and service of one day
var getCostRegionServiceDaily = function (region, service) {
    var days = 1;
    var date = new Date();
    var todayDate = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate < 10 ? '0' + date.getUTCDate : date.getUTCDate())
    var startDay = date.getFullYear() + '-' + (date.getMonth() < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1) +
        '-' + (date.getUTCDate() - days < 10 ? '0' + date.getUTCDate() - days : date.getUTCDate() - days)

    var params = {
        TimePeriod: { /* required */
            "Start": startDay,
            "End": todayDate
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        Filter: {
            //get cost from ec2 in integration
            And: [
                {
                    "Dimensions": {
                        "Key": "SERVICE",
                        "Values": [service]
                    }
                },
                {
                    "Dimensions": {
                        "Key": "REGION",
                        "Values": [region]
                    }
                }
            ]
        }
    };

    return new Promise(async (resolve, reject) => {
        try {
            var output = await getAWSCostApi(params);
            resolve(output)
        }
        catch (err) {
            reject(err);
        }
    })
}

//aws api call
var getAWSCostApi = function (params) {

    AWS.config = new AWS.Config();
    AWS.config.region = awsConfig.region;
    AWS.config.accessKeyId = awsConfig.accessKeyId;
    AWS.config.secretAccessKey = awsConfig.secretAccessKey;

    var costexplorer = new AWS.CostExplorer();

    return new Promise((resolve, reject) => {
        costexplorer.getCostAndUsage(params, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

module.exports = {
    getRegions, checkRegionCost, getCostPerRegionDaily, getActiveRegions, getActiveServices, getCostRegionServiceDaily, getCostPerServiceDaily, getAllCostDaily
}