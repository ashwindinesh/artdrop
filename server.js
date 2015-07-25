var express = require('express')
var app = express()
var request = require('request')
var config = require('./config')

function s3Url(filename) {
  return [config.s3Endpoint, config.s3BucketName, filename].join('/')
}

app.get('/images/:imageName', function(req, res) {
  request(s3Url(req.params.imageName)).pipe(res)
})

app.use(express.static('hosted-dir'))

app.get('/*', function(req, res) {
  res.sendFile(__dirname + '/hosted-dir/index.html')
})
var port = (config.env === 'dev' ? config.devPort : 80)
var server = app.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
})
