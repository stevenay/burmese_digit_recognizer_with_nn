const mnist = require('mnist')
const synaptic = require('synaptic')
const fs = require('fs')

// creates a training set of 9000 images and a testset with 4000 elements
const set = mnist.set(9000, 3000)

const trainingSet = set.training
const testSet = set.test

const Layer = synaptic.Layer
const Network = synaptic.Network
const Trainer = synaptic.Trainer

// As the size of each image is 28x28px,
// the number of pixels the network has to take as input is 28 x 28 = 784
const inputLayer = new Layer(784)
const hiddenLayer = new Layer(100)
const outputLayer = new Layer(10)

inputLayer.project(hiddenLayer)
hiddenLayer.project(outputLayer)

const myNetwork = new Network({
  input: inputLayer,
  hidden: [hiddenLayer],
  output: outputLayer
})

const trainer = new Trainer(myNetwork)
trainer.train(trainingSet, {
  rate: 0.2,
  iterations: 700,
  error: 0.1,
  shuffle: true,
  log: 1,
  cost: Trainer.cost.CROSS_ENTROPY
})

var exported = JSON.stringify(myNetwork.toJSON())
fs.writeFile('myBurmeseNetwork.json', exported, 'utf8', function(err) {
  if (err) {
    console.log('The file could not be written.', err)
  }
  console.log('Json has been successfully saved.')
})