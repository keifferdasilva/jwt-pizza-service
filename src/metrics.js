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
            this.sendHTTPMetricToGrafana('request', 'all', 'total', this.totalRequests);
            this.sendHTTPMetricToGrafana('request', 'get', 'total', this.getRequests);
            this.sendHTTPMetricToGrafana('request', 'delete', 'total', this.deleteRequests);
            this.sendHTTPMetricToGrafana('request', 'post', 'total', this.postRequests);
            this.sendHTTPMetricToGrafana('request', 'put', 'total', this.putRequests);
            this.sendUsageMetricToGrafana('usage', 'cpu', getCpuUsagePercentage());
            this.sendUsageMetricToGrafana('usage', 'memory', getMemoryUsagePercentage());
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

    sendMetricToGrafana(metric) {
        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metric,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        })
            .then((response) => {
                if (!response.ok) {
                    console.error('Failed to push metrics data to Grafana');
                    console.error(response);
                } else {
                    console.log(`Pushed ${metric}`);
                }
            })
            .catch((error) => {
                console.error('Error pushing metrics:', error);
            });
    }

    sendHTTPMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);

    }

    sendUsageMetricToGrafana(metricPrefix, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);
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