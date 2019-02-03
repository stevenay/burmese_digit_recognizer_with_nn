from array import *
import pickle

dataset = []

# load dataset from pickle
with open("data.pkl", "rb") as file:
    dataset = pickle.load(file)

setNames = [['trainDataset', 'train'], ['testDataset', 'test']]

for setName in setNames:
    # get train and test dataset
    trainDataset = dataset[setName[0]]

    dataImage = array('B')
    dataLabel = array('B')

    for td in trainDataset:
        dataImage.extend(td['image'].flatten())
        dataLabel.append(td['label'])

    hexval = "{0:#0{1}x}".format(len(trainDataset), 6)  # number of files in HEX

    # header for label array

    header = array('B')
    header.extend([0, 0, 8, 1, 0, 0])
    header.append(int('0x' + hexval[2:][:2], 16))
    header.append(int('0x' + hexval[2:][2:], 16))

    dataLabel = header + dataLabel

    # additional header for images array
    width, height = 28, 28
    header.extend([0, 0, 0, width, 0, 0, 0, height])

    header[3] = 3  # Changing MSB for image data (0x00000803)

    dataImage = header + dataImage

    output_file = open(setName[1] + '-images-idx3-ubyte', 'wb')
    dataImage.tofile(output_file)
    output_file.close()

    output_file = open(setName[1] + '-labels-idx1-ubyte', 'wb')
    dataLabel.tofile(output_file)
    output_file.close()

# gzip resulting files

# for name in setNames:
#     os.system('gzip ' + name[1] + '-images-idx3-ubyte')
#     os.system('gzip ' + name[1] + '-labels-idx1-ubyte')