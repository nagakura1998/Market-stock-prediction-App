const main = document.getElementById("main");
const footer = document.getElementById("footer");
const form = document.getElementById("form");
const toggle = document.querySelector('.toggle');
const search = document.getElementById("search");
const modal = document.querySelector('.modal')
const main_page = document.querySelector('.main-page');

var g_stockData;
function ClearCurrentView() {
    main.innerHTML = "";
    footer.innerHTML = "";
}

const sessionOption = { executionProviders: ['wasm', 'webgl'] };
var inferenceSession;
async function createInferenceSession(onnxModelURL, sessionOption) 
{
    try {
        inferenceSession = await ort.InferenceSession.create(onnxModelURL, sessionOption);
    } catch (e) {
        console.log(`failed to load ONNX model: ${e}.`);
    }
}

LoadStockData()

async function LoadStockData(){
    showLoading();
    const response = await fetch('./stockData.json');
    response.json().then(res=>{
        g_stockData = res;
        ReadStockData(res);
    })
    hideLoading();
}

function ReadStockData(stockData){
    ClearCurrentView();
    for (let symbol in stockData) {
        const stockMarketEl = document.createElement("div");
        stockMarketEl.classList.add("stockMarket");

        stockMarketEl.innerHTML = `
            <div class="stockMarket-info">
                <h3>${symbol}</h3>
            </div>
        `;
        stockMarketEl.addEventListener('click',(e)=>{
            e.preventDefault();
            
            showPrediction(stockData[symbol], symbol);
        });
        main.appendChild(stockMarketEl);
    }
}

async function showPrediction(stock, symbol) {
    showLoading()
    // Load model and create inference session once.
    const onnxModelURL = `./models/${symbol}_model.onnx`;
    await createInferenceSession(onnxModelURL, sessionOption);

    let minOpen = Math.min( ...stock.history.open ), maxOpen = Math.max( ...stock.history.open );
    let minHigh = Math.min( ...stock.history.high ), maxHigh = Math.max( ...stock.history.high );
    let minLow = Math.min( ...stock.history.low ), maxLow = Math.max( ...stock.history.low );
    let minVolume = Math.min( ...stock.history.volume ), maxVolume = Math.max( ...stock.history.volume );
    let minClose = Math.min( ...stock.history.close ), maxClose = Math.max( ...stock.history.close );
    
    let inputMin = new Array;
    let inputDenominator = new Array;
    let futureResult = new Array;
    let futureDate = new Array;

    inputMin.push(minOpen, minHigh, minLow, minVolume, minClose);
    inputDenominator.push(maxOpen-minOpen, maxHigh-minHigh, maxLow-minLow,maxVolume-minVolume, maxClose-minClose);

    let inputPrediction = [...stock.predictInput]
    for (let i = 0; i < 7; i++){
        for (let j = 0; j< 5; j++){
            inputPrediction[i*5 + j] = (inputPrediction[i*5 + j] - inputMin[j]) / (inputDenominator[j] + 1e-7)
        }
    }

    let lastDate = new Date(stock.history.date[stock.history.date.length - 1]);
    for (let i = 0; i< 14;i++){
        // prepare feeds. use model input names as keys.
        const inputData = Float32Array.from(inputPrediction);
        const inputTensor = new ort.Tensor('float32', inputData, [1,7,5]);

        const feeds = { input: inputTensor };

        const results = await inferenceSession.run(feeds);

        inputPrediction.splice(0, 5)
        inputPrediction.push(...results[100].data)

        futureResult.push(results[100].data[4]*(inputDenominator[4] + 1e-7) + inputMin[4])
        lastDate.setDate(lastDate.getDate()+1)
        futureDate.push(`${lastDate.getUTCFullYear()}-${lastDate.getUTCMonth()+1}-${lastDate.getUTCDate()}`)
    }
    
    let futureMin = Math.min( ...futureResult ), futureMax = Math.max( ...futureResult );

    ClearCurrentView();

    const chart = document.createElement("div");
    chart.classList.add("chart");
    chart.innerHTML = `
        <canvas id="myChart1" class="chart1" style="width:100%;max-width:1254px"></canvas> 
        <canvas id="myChart2" class="chart2" style="width:100%;max-width:1254px"></canvas>
        `;

    main.appendChild(chart);

    const canvas1 = document.getElementById("myChart1");
    const canvas2 = document.getElementById("myChart2");
    const ctx1 = canvas1.getContext("2d");
    const ctx2 = canvas2.getContext("2d");

    chart1 =  new Chart(ctx1, {
        type: "line",
        data: {
            labels: stock.history.date,
            datasets: [
            {
                label: "close price",
                fill: false,
                lineTension: 0,
                pointRadius: 0.1,
                backgroundColor: "rgba(0,0,255,1.0)",
                borderColor: "rgba(0,0,255,0.5)",
                data: stock.history.close
            }
        ]
        },
        options: {
            legend: {
                display: true,
                labels: {
                    color: 'rgb(255, 99, 132)'
                }
            },
            scales: {
            yAxes: [{ticks: {min: minClose - 5, max:maxClose + 5}}],
            },
            title: {
              display: true,
              text: "All Time Data"
            }
        }
    });

    chart2 = new Chart(ctx2, {
        type: "line",
        data: {
            labels: futureDate,
            datasets: [
            {
                label: "future prediction",
                fill: false,
                lineTension: 0,
                pointRadius: 0.1,
                backgroundColor: "rgba(0,0,255,1.0)",
                borderColor: "rgba(0,0,255,0.5)",
                data: futureResult
            }
        ]
        },
        options: {
            legend: {
                display: true,
                labels: {
                    color: 'rgb(255, 99, 132)'
                }
            },
            scales: {
            yAxes: [{ticks: {min: futureMin - 5, max:futureMax + 5}}],
            },
            title: {
              display: true,
              text: "Future 14 days Prediction"
            }
        }
    });
    hideLoading()
}

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const searchTerm = search.value;
    let searchResult = {};
    if (searchTerm) {
        for (let symbol in g_stockData) {
            if (symbol.indexOf(searchTerm.toUpperCase())!=-1){
                searchResult[symbol] = g_stockData[symbol];
            }
        }
        ReadStockData(searchResult);
        search.value = "";
    }
});

main_page.addEventListener('click', e=>{
    e.preventDefault();
    ReadStockData(g_stockData);
})
function showLoading(){
    modal.classList.add('open')
}
function hideLoading(){
    modal.classList.remove('open')
}

