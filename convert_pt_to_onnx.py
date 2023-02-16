# import torch

# class Net(torch.nn.Module):
#     def __init__(self, input_dim, hidden_dim, output_dim, layers):
#         super(Net, self).__init__()
#         self.rnn = torch.nn.LSTM(input_dim, hidden_dim, num_layers = layers, batch_first = True)
#         self.fc = torch.nn.Linear(hidden_dim, output_dim, bias = True)
#     def forward(self, x):
#         x, _status = self.rnn(x)
#         x = self.fc(x[:,-1])
#         return x
        
# for stock in stockList:
#     pytorch_model = Net(5, 10, 5, 1)
#     pytorch_model.load_state_dict(torch.load("./{}_param.pt".format(stock)))
#     pytorch_model.eval()
#     dummy_input = torch.zeros([1,7,5])
#     torch.onnx.export(pytorch_model, dummy_input, "./{}_model.onnx".format(stock), verbose=True)