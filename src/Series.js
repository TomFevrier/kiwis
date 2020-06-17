import fs from 'fs';

import d3 from 'd3-array';

/**
* @class
* @property {number} length The number of values in the Series
* @property {boolean} empty Whether the Series contains any value or not
*/

export default class Series {

	/**
	* @function callback
	* @param {Object} currentElement
	* @param {number} index
	*/

	/**
	* @constructor
	* @param {(*[]|Series)} data An array of values or a Series
	*/
	constructor(data) {
		if (data instanceof Series) {
			this._data = data._data;
		}
		else {
			this._data = Array.from(JSON.parse(JSON.stringify(data)));
		}
		this._data.forEach((value, index) => {
			Object.defineProperty(this, index, {
				value: value
			});
		});
	}

	get length() {
		return this._data.length;
	}

	get empty() {
		return this._data.length == 0;
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
	* @param {number} [n=5] Number of rows to select
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
		}
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
		}
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
	* Sorts the Series
	* @param {Object} [options] Options
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
	* Filters values of the Series
	* @param {callback} filter Callback to apply
	* @param {Object} [options] Options
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
	* Drops NA values from the Series
	* @param {Object} [options] Options
	* @param {*[]} [options.keep=[0]] Array of falsy values to keep in the Series
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	dropNA(options = {}) {
		const keep = options.keep || [0];
		return this.filter(value => Boolean(value) || keep.includes(value));
	}

	/**
	* Round the values in the Series
	* @param {number} digits Number of digits for rounding
	* @param {Object} [options] Options
	* @param {boolean} [options.inPlace=false] Changes the current Series instead of returning a new one
	* @returns {Series}
	*/
	round(digits = 0, options = {}) {
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
		return d3.sum(this._data, d => +d);
	}

	/**
	* Returns the minimum value in the Series
	* @returns {number}
	*/
	min() {
		return d3.min(this._data, d => +d);
	}

	/**
	* Returns the maximum value in the Series
	* @returns {number}
	*/
	max() {
		return d3.max(this._data, d => +d);
	}

	/**
	* Returns the mean of the values in the Series
	* @returns {number}
	*/
	mean() {
		return d3.mean(this._data, d => +d);
	}

	/**
	* Returns the median of the values in the Series
	* @returns {number}
	*/
	median() {
		return d3.median(this._data, d => +d);
	}

	/**
	* Returns the standard deviation of the values in the Series
	* @returns {number}
	*/
	std() {
		return d3.deviation(this._data, d => +d);
	}

	/**
	* Displays the Series
	*/
	show() {
		const MAX_WIDTH = 42;
		const MAX_LENGTH = 25;

		const widths = [
			Math.min(MAX_LENGTH.toString().length, this.length.toString().length),
			d3.max(this._data, d => d && d.toString().length)
		];

		const lines = [];
		this._data
			.slice(0, MAX_LENGTH)
			.map(value => value ? value.toString() : '')
			.forEach((value, index) => {
				const line = [
					index.toString().padEnd(widths[0]),
					value.length > MAX_WIDTH
						? `${value.substr(0, MAX_WIDTH - 3)}...`
						: value.padStart(widths[index + 1])
				].join(' | ');
				lines.push(line);
			});
		if (this.length > MAX_LENGTH) lines.push('...');
		lines.push('');
		lines.push(`Total length: ${this.length}`);
		lines.push('');
		console.log(lines.join('\n'));
	}

	/**
	* Saves the Series as a CSV file
	* @param {string} path Path of the file to save
	* @param {Object} [options] Options
	* @param {string} [options.name='series'] Column name to use
	*/
	saveCSV(path, options = {}) {
		const delimiter = options.delimiter || ',';
		const name = options.name || 'series';
		let content = [name, ...this._data].join('\n');
		fs.writeFileSync(path, content);
	}

	/**
	* Saves the Series as a JSON file
	* @param {string} path Path of the file to save
	* @param {Object} [options] Options
	* @param {string} [options.name='series'] Column name to use
	* @param {boolean} [options.prettify=true] Prettify JSON output
	*/
	saveJSON(path, options = {}) {
		const prettify = options.prettify;
		const name = options.name || 'series';
		fs.writeFileSync(path, JSON.stringify({ [name]: this._data }, null, prettify ? '\t' : null));
	}

}
