var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

var Parser = require('./../');
var ParserOLD = require('./old/parser');

function returnError (error) {
	error = null;
}

function checkReply () {}

function shuffle (array) {
	var currentIndex = array.length;
	var temporaryValue;
	var randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex !== 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

var startBuffer = new Buffer('$100\r\nabcdefghij');
var chunkBuffer = new Buffer('abcdefghijabcdefghijabcdefghij');
var stringBuffer = new Buffer('+testing a simple string\r\n');
var integerBuffer = new Buffer(':1237884\r\n');
var errorBuffer = new Buffer('-Error ohnoesitbroke\r\n');
var arrayBuffer = new Buffer('*1\r\n*1\r\n$1\r\na\r\n');
var endBuffer = new Buffer('\r\n');
var lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ' +
	'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
	'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ' +
	'ut aliquip ex ea commodo consequat. Duis aute irure dolor in'; // 256 chars
var bigStringArray = (new Array(Math.pow(2, 16) / lorem.length).join(lorem + ' ')).split(' '); // Math.pow(2, 16) chars long
var startBigBuffer = new Buffer('$' + (4 * 1024 * 1024) + '\r\n' + lorem);
var chunks = new Array(64);
for (var i = 0; i < 64; i++) {
	chunks[i] = new Buffer(shuffle(bigStringArray).join(' ') + '.'); // Math.pow(2, 16) chars long
}

var parserOld = new ParserOLD({
	returnReply: checkReply,
	returnError: returnError,
	returnFatalError: returnError,
	name: 'javascript'
});

var parserHiRedis = new Parser({
	returnReply: checkReply,
	returnError: returnError,
	returnFatalError: returnError,
	name: 'hiredis'
});

var parser = new Parser({
	returnReply: checkReply,
	returnError: returnError,
	returnFatalError: returnError,
	name: 'javascript'
});

// BULK STRINGS

suite.add('OLD CODE: multiple chunks in a bulk string', function () {
	parserOld.execute(startBuffer);
	parserOld.execute(chunkBuffer);
	parserOld.execute(chunkBuffer);
	parserOld.execute(chunkBuffer);
	parserOld.execute(endBuffer);
});

suite.add('HIREDIS: multiple chunks in a bulk string', function () {
	parserHiRedis.execute(startBuffer);
	parserHiRedis.execute(chunkBuffer);
	parserHiRedis.execute(chunkBuffer);
	parserHiRedis.execute(chunkBuffer);
	parserHiRedis.execute(endBuffer);
});

suite.add('NEW CODE: multiple chunks in a bulk string', function () {
	parser.execute(startBuffer);
	parser.execute(chunkBuffer);
	parser.execute(chunkBuffer);
	parser.execute(chunkBuffer);
	parser.execute(endBuffer);
});

// BIG BULK STRING

suite.add('\nOLD CODE: 4mb bulk string', function () {
	parserOld.execute(startBigBuffer);
	for (var i = 0; i < 64; i++) {
		parserOld.execute(chunks[i]);
	}
	parserOld.execute(endBuffer);
});

suite.add('HIREDIS: 4mb bulk string', function () {
	parserHiRedis.execute(startBigBuffer);
	for (var i = 0; i < 64; i++) {
		parserHiRedis.execute(chunks[i]);
	}
	parserHiRedis.execute(endBuffer);
});

suite.add('NEW CODE: 4mb bulk string', function () {
	parser.execute(startBigBuffer);
	for (var i = 0; i < 64; i++) {
		parser.execute(chunks[i]);
	}
	parser.execute(endBuffer);
});

// STRINGS

suite.add('\nOLD CODE: + simple string', function () {
	parserOld.execute(stringBuffer);
});

suite.add('HIREDIS: + simple string', function () {
	parserHiRedis.execute(stringBuffer);
});

suite.add('NEW CODE: + simple string', function () {
	parser.execute(stringBuffer);
});

// INTEGERS

suite.add('\nOLD CODE: + integer', function () {
	parserOld.execute(integerBuffer);
});

suite.add('HIREDIS: + integer', function () {
	parserHiRedis.execute(integerBuffer);
});

suite.add('NEW CODE: + integer', function () {
	parser.execute(integerBuffer);
});

// ARRAYS

suite.add('\nOLD CODE: * array', function () {
	parserOld.execute(arrayBuffer);
});

suite.add('HIREDIS: * array', function () {
	parserHiRedis.execute(arrayBuffer);
});

suite.add('NEW CODE: * array', function () {
	parser.execute(arrayBuffer);
});


// ERRORS

suite.add('\nOLD CODE: * error', function () {
	parserOld.execute(errorBuffer);
});

suite.add('HIREDIS: * error', function () {
	parserHiRedis.execute(errorBuffer);
});

suite.add('NEW CODE: * error', function () {
	parser.execute(errorBuffer);
});


// add listeners
suite.on('cycle', function (event) {
	console.log(String(event.target));
});

suite.on('complete', function () {
	console.log('\n\nFastest is ' + this.filter('fastest').map('name'));
});

suite.run({ delay: 1, minSamples: 150 });
