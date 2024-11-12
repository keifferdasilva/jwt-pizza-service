const config = require('./config.js');
const os = require('os');

class Metrics {
    constructor() {
        this.totalRequests = 0;
        this.getRequests = 0;
        this.postRequests = 0;
        this.deleteRequests = 0;
        this.putRequests = 0;

        // This will periodically sent metrics to Grafana
        const timer = setInterval(() => {
            this.sendMetricToGrafana('request', 'all', 'total', this.totalRequests);
            this.sendMetricToGrafana('request', 'get', 'total', this.getRequests);
            this.sendMetricToGrafana('request', 'delete', 'total', this.deleteRequests);
            this.sendMetricToGrafana('request', 'post', 'total', this.postRequests);
            this.sendMetricToGrafana('request', 'put', 'total', this.putRequests);
        }, 10000);
        timer.unref();
    }

    incrementTotalRequests() {
        this.totalRequests++;
    }

    incrementGetRequests(){
        this.getRequests++;
    }

    incrementPostRequests(){
        this.postRequests++;
    }

    incrementDeleteRequests(){
        this.deleteRequests++;
    }

    incrementPutRequests() {
        this.putRequests++;
    }

    sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;

        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metric,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        })
            .then((response) => {
                if (!response.ok) {
                    console.error('Failed to push metrics data to Grafana');
                } else {
                    console.log(`Pushed ${metric}`);
                }
            })
            .catch((error) => {
                console.error('Error pushing metrics:', error);
            });
    }

}



function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}
const metrics = new Metrics();

requestTracker = (req, res, next) =>{
    let method = req.method;
    metrics.incrementTotalRequests();
    switch (method) {
        case 'POST':
            metrics.incrementPostRequests();
            break;
        case 'DELETE':
            metrics.incrementDeleteRequests();
            break;
        case 'GET':
            metrics.incrementGetRequests();
            break;
        case 'PUT':
            metrics.incrementPutRequests();
            break;
        default:
            break;
    }
    next();
}
module.exports = {getCpuUsagePercentage, getMemoryUsagePercentage, metrics, requestTracker};