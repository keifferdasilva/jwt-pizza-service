const config = require('./config.js');
const os = require('os');

class Metrics {
    constructor() {
        this.totalRequests = 0;
        this.getRequests = 0;
        this.postRequests = 0;
        this.deleteRequests = 0;
        this.putRequests = 0;
        this.activeUsers = 0;
        this.successfulAuthentication = 0;
        this.unsuccessfulAuthentication = 0;
        this.pizzasSold = 0;
        this.failedPizzas = 0;
        this.revenue = 0;

        // This will periodically send metrics to Grafana
        const timer = setInterval(() => {
            this.sendHTTPMetricToGrafana( 'all', 'total', this.totalRequests);
            this.sendHTTPMetricToGrafana( 'get', 'total', this.getRequests);
            this.sendHTTPMetricToGrafana( 'delete', 'total', this.deleteRequests);
            this.sendHTTPMetricToGrafana( 'post', 'total', this.postRequests);
            this.sendHTTPMetricToGrafana( 'put', 'total', this.putRequests);
            this.sendUsageMetricToGrafana( 'cpu', getCpuUsagePercentage());
            this.sendUsageMetricToGrafana( 'memory', getMemoryUsagePercentage());
            this.sendActiveMetricToGrafana('total', this.activeUsers);
            this.sendAuthenticationMetricToGrafana('success', this.successfulAuthentication);
            this.sendAuthenticationMetricToGrafana('failure', this.unsuccessfulAuthentication);
            this.sendPizzaMetricToGrafana('sold', this.pizzasSold);
            this.sendPizzaMetricToGrafana('failures', this.failedPizzas);
            this.sendPizzaMetricToGrafana('revenue', this.revenue);
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

    incrementActiveUsers() {
        this.activeUsers++;
    }

    decrementActiveUsers() {
        this.activeUsers--;
    }

    incrementSuccessfulAuthentication() {
        this.successfulAuthentication++;
    }

    incrementUnsuccessfulAuthentication() {
        this.unsuccessfulAuthentication++;
    }

    incrementPizzasSold() {
        this.pizzasSold++;
    }

    incrementFailedPizzas() {
        this.failedPizzas++;
    }

    addToRevenue(value){
        this.revenue += value;
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
                    console.error(metric);
                } else {
                    console.log(`Pushed ${metric}`);
                }
            })
            .catch((error) => {
                console.error('Error pushing metrics:', error);
            });
    }

    sendHTTPMetricToGrafana(httpMethod, metricName, metricValue) {
        const metric = `request,source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);

    }

    sendUsageMetricToGrafana(metricName, metricValue) {
        const metric = `usage,source=${config.metrics.source} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);
    }

    sendActiveMetricToGrafana(metricName, metricValue) {
        const metric = `active,source=${config.metrics.source} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);
    }

    sendAuthenticationMetricToGrafana(metricName, metricValue){
        const metric = `authentication,source=${config.metrics.source} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);
    }

    sendLatencyMetricToGrafana(httpMethod, path, metricName, metricValue){
        const metric = `request,source=${config.metrics.source},method=${httpMethod},path=${path} ${metricName}=${metricValue}`;
        this.sendMetricToGrafana(metric);
    }

    sendPizzaMetricToGrafana(metricName, metricValue) {
        const metric = `pizza,source=${config.metrics.source} ${metricName}=${metricValue}`;
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

function pizzaCreationLatency(startTime, endTime) {
    const latency = endTime - startTime;
    const metric = `pizza,source=${config.metrics.source} latency=${latency}`;
    metrics.sendMetricToGrafana(metric);
}
const metrics = new Metrics();

function requestTracker(req, res, next){
    let startTime = Date.now();
    let method = req.method;
    let path = req.path;

    res.on("finish", function() {

        //Send latency of request
        let endTime = Date.now();

        const latency = endTime - startTime;
        metrics.sendLatencyMetricToGrafana(method, path, 'latency', latency);

        //Track active users/successful authentication
        if (path === '/api/auth' && res.statusCode === 200) {
            metrics.incrementSuccessfulAuthentication();
            if (method === 'POST' || method === 'PUT') {
                metrics.incrementActiveUsers();
            } else if (method === 'DELETE') {
                metrics.decrementActiveUsers();
            }
        }
        //Track unsuccessful authentication
        else if (path === '/api/auth' && res.statusCode !== 200) {
            metrics.incrementUnsuccessfulAuthentication();
        }

        if(path === '/api/order' && method === 'POST'){
            if(res.statusCode === 200){
                metrics.incrementPizzasSold();
                let items = req.body.items;
                let revenue = 0;
                for (const item of items) {
                    revenue += item.price;
                }
                metrics.addToRevenue(revenue);
            }
            else if(res.statusCode === 500){
                metrics.incrementFailedPizzas();
            }
        }

    });

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
module.exports = {metrics, requestTracker, pizzaCreationLatency};