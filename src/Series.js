'use strict';

const fs = require('fs');
const d3 = require('d3-array');


/**
* @class
* @property {number} length The number of values in the Series
* @property {boolean} empty Whether the Series contains any value or not
*/

class Series {

	/**
	* @function callback
	* @param {Object} currentElement
	* @param {number} index
	*/

	/**
	* @constructor
	* @hideconstructor
	* @param {(*[]|Series)} data An array of values or a Series
	*/
	constructor(data) {
		if (!data) {
			this._data = [];
		}
		else if (data instanceof Series) {
			this._data = data._data;
		}
		else {
			this._data = Array.from(JSON.parse(JSON.stringify(data)));
		}
		this._data.forEach((value, index) => {
			Object.defineProperty(this, index, {
				value: value,
				configurable: true
			});
		});

		this._kw = require('./Kiwis.js');
	}

	get length() {
		return this._data.length;
	}

	get empty() {
		return this._data.length === 0;
	}

	/**
	* Returns the Series as an array
	* @returns {*[]}
	*/
	toArray() {
		return this._data;
	}

	/**
	* Clones the Series
	* @returns {Series}
	*/
	clone() {
		return new Series(this);
	}

	/**
	* Returns any row of the Series
	* @param {number} index
	* @returns {*}
	*/
	get(index) {
		return this._data[index];
	}

	/**
	* Returns the first value of the Series
	* @returns {*}
	*/
	first() {
		return this._data[0];
	}

	/**
	* Returns the last value of the Series
	* @returns {*}
	*/
	last() {
		return this._data[this._data.length - 1];
	}

	/**
	* Returns a new Series containing the first N values of the Series
	* @param {number} [n=5] Number of values to select
	* @returns {Series}
	*/
	head(n = 5) {
		return this.slice(0, n);
	}

	/**
	* Returns a new Series containing the last N values of the Series
	* @param {number} [n=5] Number of values to select
	* @returns {Series}
	*/
	tail(n = 5) {
		return this.slice(-n);
	}

	/**
	* Returns a new Series with a slice of the original values
	* @param {number} start Zero-based index at which to start extraction
	* @param {number} [end=Series.length] Zero-based index before which to end extraction
	* @returns {Series}
	*/
	slice(start, end) {
		return new Series(this._data.slice(start, end));
	}

	/**
	* Returns the values of the Series as an iterable
	* @returns {Iterable.<*>}
	*/
	values() {
		let index = 0;
		const data = this._data;
		return {
			next: function () {
				let value = index < data.length ? data[index] : null;
				index++;
				return {
					value: value,
					done: index > data.length
				};
			},
			[Symbol.iterator]: function () { return this; }
		};
	}

	/**
	* Returns an array of index/value pairs as an iterable
	* @returns {Iterable.<Array.<number, *>>}
	*/
	items() {
		let index = 0;
		const data = this._data;
		return {
			next: function () {
				let value = index < data.length ? [index, data[index]] : null;
				index++;
				return {
					value: value,
					done: index > data.length
				};

			},
			[Symbol.iterator]: function () { return this; }
		};
	}

	/**
	* Applies a callback function to each value of the Series
	* @param {callback} callback
	*/
	forEach(callback) {
		this._data.forEach(callback);
	}

	/**
	* Returns a new Series populated with the results of a callback function applied on the Series
	* @param {callback} callback
	* @returns {Series}
	*/
	map(callback) {
		return new Series(this._data.map(callback));
	}

	/**
	* Appends new values to a Series
	* @param {Object|Object[]} values Value or array of values to append to the Series
	* @returns {Series}
	*/
	append(values) {
		const data = Array.isArray(values) ? values : [values];
		this._data = [...this._data, ...data];
		return this;
	}

	/**
	* Inserts new values into a Series
	* @param {Object|Object[]} values Value or array of values to insert into the Series
	* @param {number} [index=0] Index to insert the values at
	* @returns {Series}
	*/
	insert(values, index = 0) {
		const data = Array.isArray(values) ? values : [values];
		this._data.splice(index, 0, ...data);
		return this;
	}

	/**
	* Concats another Series to the Series
	* @param {Series} other
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	concat(other, options = {}) {
		return this.append(other.toArray(), options);
	}

	/**
	* Drops N/A values from the Series
	* @param {Object} [options]
	* @param {*[]} [options.keep=[0, false]] Array of falsy values to keep in the Series
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	dropNA(options = {}) {
		const keep = options.keep || [0, false];
		return this.filter(value => Boolean(value) || keep.includes(value));
	}

	/**
	* Drops duplicate values from the Series
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	dropDuplicates(options = {}) {
		const inPlace = options.inPlace || false;
		if (inPlace) {
			this._data = [...new Set(this._data)];
			return this;
		}
		const s = this.clone();
		s._data = [...new Set(s._data)];
		return s;
	}

	/**
	* Returns true if any value of the series satisfies the given condition
	* @param {callback} [condition=!Kiwis.isNA]
	* @returns {boolean}
	*/
	any(condition = e => !this._kw.isNA(e)) {
		return this._data.some(condition);
	}

	/**
	* Returns true if all values of the series satisfy the given condition
	* @param {callback} [condition=!Kiwis.isNA]
	* @returns {boolean}
	*/
	all(condition = e => !this._kw.isNA(e)) {
		return this._data.every(condition);
	}

	/**
	* Filters values of the Series
	* @param {callback} filter Callback to apply
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	filter(filter, options = {}) {
		const inPlace = options.inPlace || false;
		const filteredData = this._data.filter(filter);
		if (inPlace) {
			this._data = filteredData;
			return this;
		}
		return new Series(filteredData);
	}

	/**
	* Drops values from the Series
	* @param {callback} filter Callback to apply
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	drop(filter, options = {}) {
		return this.filter(e => !filter(e), options);
	}

	/**
	* Sorts the Series
	* @param {Object} [options]
	* @param {boolean} [options.reverse=false] Sorts the Series in descending order
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	sort(options = {}) {
		const reverse = options.reverse || false;
		const inPlace = options.inPlace || false;
		const sortedData = [...this._data].sort((a, b) => {
			return reverse ? b - a : a - b;
		});
		if (inPlace) {
			this._data = sortedData;
			return this;
		}
		return new Series(sortedData);
	}

	/**
	* Shuffles the values of a Series
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	shuffle(options = {}) {
		const inPlace = options.inPlace || false;
		if (inPlace) {
			this._data.sort(() => Math.random() - 0.5);
			return this;
		}
		const s = this.clone();
		s._data.sort(() => Math.random() - 0.5);
		return s;
	}

	/**
	* Returns the unique values in the Series as an array
	* @returns {*[]}
	*/
	unique() {
		return [...new Set(this._data)];
	}

	/**
	* Returns the number of occurences for each value in the Series
	* @param {Object} [options]
	* @param {boolean} [options.sort=true] Sorts the counts
	* @param {boolean} [options.reverse=true] Sorts the counts in descending order
	* @returns {Object} Counts as an object of value/count pairs
	*/
	counts(options = {}) {
		const sort = options.sort !== undefined ? options.sort : true;
		const reverse = options.reverse !== undefined ? options.reverse : true;
		const counts = this._data.reduce((acc, value) => {
			if (value in acc) {
				acc[value]++;
				return acc;
			}
			return {
				...acc,
				[value]: 1
			};
		}, {});
		if (sort) {
			return Object.entries(counts)
				.sort((a, b) => reverse ? b[1] - a[1] : a[1] - b[1])
				.reduce((acc, [value, count]) => ({
					...acc,
					[value]: count
				}), {});
		}
		return counts;
	}

	/**
	* Returns the frequency for each value in the Series
	* @param {Object} [options]
	* @param {boolean} [options.sort=true] Sorts the frequencies
	* @param {boolean} [options.reverse=true] Sorts the frequencies in descending order
	* @returns {Object} Counts as an object of value/frequencies pairs
	*/
	frequencies(options = {}) {
		const counts = this.counts(options);
		return Object.entries(counts).reduce((acc, [value, count]) => ({
			...acc,
			[value]: count / this.length
		}), {});
	}

	/**
	* Round the values in the Series
	* @param {number} digits Number of digits for rounding
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	round(digits = 0, options = {}) {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot round non-number values');
		const inPlace = options.inPlace || false;
		if (inPlace) {
			this._data = this._data.map(value => (+value).toFixed(digits));
			return this;
		}
		return new Series(this._data.map(value => (+value).toFixed(digits)));
	}


	/**
	* Returns the sum of the values in the Series
	* @returns {number}
	*/
	sum() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot sum non-number values');
		return d3.sum(this._data, d => +d);
	}

	/**
	* Returns the minimum value in the Series
	* @returns {number}
	*/
	min() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot compute non-number values');
		return d3.min(this._data, d => +d);
	}

	/**
	* Returns the maximum value in the Series
	* @returns {number}
	*/
	max() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot compute non-number values');
		return d3.max(this._data, d => +d);
	}

	/**
	* Returns the extent of the Series
	* @returns {[number, number]}
	*/
	extent() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot compute non-number values');
		return d3.extent(this._data, d => +d);
	}

	/**
	* Returns the mean of the values in the Series
	* @returns {number}
	*/
	mean() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot average non-number values');
		return d3.mean(this._data, d => +d);
	}

	/**
	* Returns the median of the values in the Series
	* @returns {number}
	*/
	median() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot compute non-number values');
		return d3.median(this._data, d => +d);
	}

	/**
	* Returns the standard deviation of the values in the Series
	* @returns {number}
	*/
	std() {
		if (this.any(value => Number.isNaN(+value)))
			throw new Error('Cannot compute non-number values');
		return d3.deviation(this._data, d => +d);
	}

	/**
	* Format the Series for display
	* @returns {string}
	*/
	toString() {
		if (this.empty) {
			return 'Empty Series';
		}

		const MAX_WIDTH = 42;
		const MAX_LENGTH = 25;

		const widths = [
			Math.min(MAX_LENGTH.toString().length, this.length.toString().length),
			Math.min(MAX_WIDTH, d3.max(this._data, d => d && d.toString().length))
		];

		const lines = [];
		this._data
			.slice(0, MAX_LENGTH)
			.map(value => !this._kw.isNA(value) ? value.toString() : 'N/A')
			.forEach((value, index) => {
				const line = [
					index.toString().padEnd(widths[0]),
					value.length > MAX_WIDTH
						? `${value.substr(0, MAX_WIDTH - 3)}...`
						: value.padStart(widths[1])
				].join(' | ');
				lines.push(line);
			});
		if (this.length > MAX_LENGTH) lines.push('...');
		lines.push('');
		lines.push(`Length: ${this.length}`);
		return lines.join('\n');
	}

	/**
	* Displays the Series
	*/
	show() {
		console.log(this.toString());
		console.log();
	}

	/**
	* Exports the Series as CSV
	* @param {string} [path=null] Path of the file to save
	* @param {Object} [options]
	* @param {string} [options.name='series'] Column name to use
	* @returns {string|undefined} A JSON string if `path` is not set
	*/
	toCSV(path, options = {}) {
		const delimiter = options.delimiter || ',';
		const name = options.name || 'series';
		let content = [name, ...this._data].join('\n');
		if (!path) return content;
		fs.writeFileSync(path, content);
	}

	/**
	* Exports the Series as a JSON file
	* @param {string} [path] Path of the file to save
	* @param {Object} [options]
	* @param {string} [options.name='series'] Column name to use
	* @param {boolean} [options.prettify=true] Prettify JSON output
	* @returns {string|undefined} A JSON string if `path` is not set
	*/
	toJSON(path, options = {}) {
		const prettify = options.prettify !== undefined ? options.prettify : true;
		const name = options.name || 'series';
		const content = JSON.stringify({ [name]: this._data }, null, prettify ? '\t' : null);
		if (!path) return content;
		fs.writeFileSync(path, content);
	}

}

module.exports = Series;
