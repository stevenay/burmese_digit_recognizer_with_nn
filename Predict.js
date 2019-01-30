const fs = require('fs')
const mnist = require('mnist')
const synaptic = require('synaptic')

const knowledge = JSON.parse(fs.readFileSync('./trained_models/BurmeseNetwork_ver2.json', 'utf8'));

// Conver the network back to useable network
var myNetwork = synaptic.Network.fromJSON(knowledge);

// creates a training set of 5000 images and a testset with 3000 elements
const set = mnist.set(5000, 3000)

const trainingSet = set.training
const testSet = set.test
testSetOne = testSet[0].input

const output = myNetwork.activate(testSetOne)

var maximum = output.reduce(function(p,c) { return p>c ? p : c; });
var nominators = output.map(function(e) { return Math.exp(e - maximum); });
var denominator = nominators.reduce(function (p, c) { return p + c; });
var softmax = nominators.map(function(e) { return e / denominator; });

var maxIndex = 0;
softmax.reduce(function(p,c,i){if(p<c) {maxIndex=i; return c;} else return p;});
var result = [];
for (var i=0; i<output.length; i++)
{
    if (i==maxIndex)
        result.push(1);
    else
        result.push(0);
}

console.log(testSet[0].output)
console.log("Softmax Prediction");
console.log("------------------------------------");
console.log(result);
