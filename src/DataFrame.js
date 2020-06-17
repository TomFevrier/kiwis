import fs from 'fs';
import d3 from 'd3-array';

import Series from './Series.js';

/*
TODO :
- create DataFrame from array of arrays and a list of columns
- handle errors
- nesting / pivot tables
- merging DataFrames
*/

/**
* @class
* @property {number} length The number of rows in the DataFrame
* @property {string[]} columns The columns of the DataFrame
* @property {boolean} empty Whether the DataFrame contains any row or not
*/

export default class DataFrame {

	/**
	* @function callback
	* @param {Object} currentElement
	* @param {number} index
	*/

	/**
	* @constructor
	* @param {(Object[]|DataFrame)} data An array of objects or a DataFrame
	*/
	constructor(data) {
		if (data instanceof DataFrame) {
			this._data = data._data;
			this._columns = data._columns;
		}
		else {
			this._data = Array.from(JSON.parse(JSON.stringify(data)));
			this._columns = data.columns || Array.from(Object.keys(this._data[0]));
		}
		this._data.forEach((row, index) => {
			Object.defineProperty(this, index, {
				value: row,
				configurable: true
			});
		});
		this._columns.forEach(column => {
			Object.defineProperty(this, column, {
				value: new Series(this._data.map(e => e[column])),
				configurable: true,
				enumerable: true
			});
		})
	}

	get length() {
		return this._data.length;
	}

	get columns() {
		return this._columns;
	}

	set columns(newColumns) {
		if (this._columns.length !== newColumns.length)
			throw new Error('New array of columns should be the same length as the current array of columns');
		this._data = this._data.map(row => {
			const newRow = {};
			this._columns.forEach((column, index) => {
				newRow[newColumns[index]] = row[column];
			});
			return newRow;
		});
		this._columns.forEach((column, index) => {
			if (newColumns[index] !== column) {
				Object.defineProperty(this, newColumns[index], Object.getOwnPropertyDescriptor(this, column));
				delete this[column];
			}
		});
		this._columns = newColumns;
	}

	get empty() {
		return this._data.length == 0;
	}

	/**
	* Returns the DataFrame as an array
	* @returns {Object[]}
	*/
	toArray() {
		return this._data;
	}

	/**
	* Clones the DataFrame
	* @returns {DataFrame}
	*/
	clone() {
		return new DataFrame(this);
	}

	/**
	* Returns the first row of the DataFrame
	* @returns {Object}
	*/
	first() {
		return this._data[0];
	}

	/**
	* Returns the last row of the DataFrame
	* @returns {Object}
	*/
	last() {
		return this._data[this._data.length - 1];
	}

	/**
	* Returns a new DataFrame containing the first N rows of the DataFrame
	* @param {number} [n=5] Number of rows to select
	* @returns {DataFrame}
	*/
	head(n = 5) {
		return this.slice(0, n);
	}

	/**
	* Returns a new DataFrame containing the last N rows of the DataFrame
	* @param {number} [n=5] Number of rows to select
	* @returns {DataFrame}
	*/
	tail(n = 5) {
		return this.slice(-n);
	}

	/**
	* Returns a new DataFrame with a slice of the original rows
	* @param {number} start Zero-based index at which to start extraction
	* @param {number} [end=DataFrame.length] Zero-based index before which to end extraction
	* @returns {DataFrame}
	*/
	slice(start, end) {
		return new DataFrame(this._data.slice(start, end));
	}

	/**
	* Returns the rows of the DataFrame as an iterable
	* @returns {Iterable.<Object>}
	*/
	rows() {
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
	* Returns an array of index/row pairs as an iterable
	* @returns {Iterable.<Array.<number, Object>>}
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
	* Returns a new Series populated with the results of a callback function applied on the DataFrame
	* @param {callback} callback
	* @returns {Series}
	*/
	map(callback) {
		return new Series(this._data.map(callback));
	}

	/**
	* Filters columns or rows of the DataFrame
	* @param {(callback|string[])} filter Can be a callback (applied to rows or columns) or an array of column names to keep
	* @param {Object} [options] Options
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether the callback should apply to rows or columns
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	filter(filter, options = {}) {
		const axis = options.axis || 'rows';
		const inPlace = options.inPlace || false;

		if (typeof filter !== 'function') {
			filter.forEach(column => {
				if (this._columns.indexOf(column) < 0)
					throw new Error(`No column named '${column}'`);
			});
		}

		let filteredData;
		let columnsToKeep = [];
		if (typeof filter === 'function' && axis === 'rows')
			filteredData = this._data.filter(filter);
		else {
			let columnsToKeep = this._columns.filter(column => {
				return typeof filter === 'function'
					? filter(column)
					: filter.includes(column);
			});
			filteredData = this._data.map(row => {
				return columnsToKeep.reduce((obj, key) => ({...obj, [key]: row[key] }), {});
			});
		}
		if (inPlace) {
			this._data = filteredData;
			this._columns = this._columns.filter(column => !columnsToDrop.includes(column));
			return this;
		}
		return new DataFrame(filteredData);
	}

	/**
	* Drops NA values from the DataFrame
	* @param {Object} [options] Options
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether rows or columns should be dropped
	* @param {*[]} [options.keep=[0]] Array of falsy values to keep in the DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	dropNA(options = {}) {
		const axis = options.axis || 'rows';
		const keep = options.keep || [0];
		if (axis === 'rows') {
			return this.filter(
				row => Object.values(row).find(e => !Boolean(e) && !keep.includes(e)) === undefined,
				options
			);
		}
		else {
			return this.filter(
				column => this._data.map(row => row[column]).find(e => !Boolean(e) && !keep.includes(e)) === undefined,
				options
			);
		}
	}

	/**
	* Add a new column to the DataFrame
	* @param {string} name Name of the new column
	* @param {(*[]|Series)} column Content of the new column
	* @param {Object} [options] Options
	* @param {('auto'|'extend'|'trim')} [options.fit='auto'] If the new column is not the same length as the DataFrame: drop the extra rows (`'auto'`, length stays the same), extends the DataFrame (`'extend'`, length is that of the new column), trim the DataFrame (`'trim'`, length is that of the new column)
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	addColumn(name, column, options = {}) {
		const fit = options.fit || 'auto';
		const inPlace = options.inPlace || false;
		const data = column instanceof Series ? column.toArray() : column;
		let newData = this._data.map((row, index) => {
			return {
				...row,
				[name]: index < data.length ? data[index].toString() : null
			};
		});
		if (fit === 'trim')
			newData = newData.slice(0, data.length);
		else if (fit === 'extend') {
			data.slice(this.length).forEach(e => {
				newData.push({
					...Object.fromEntries(this._columns.map(column => ({ [column]: null }))),
					[name]: e
				});
			});
		}
		if (inPlace) {
			this._data = newData;
			this._columns.push(name);
			Object.defineProperty(this, name, {
				value: new Series(this._data.map(e => e[name])),
				configurable: true
			});
			return this;
		}
		return new DataFrame(newData);
	}

	/**
	* Sorts the DataFrame
	* @param {(string|string[])} by Key or array of keys to sort the DataFrame by
	* @param {Object} [options] Options
	* @param {boolean} [options.reverse=false] Sorts the DataFrame in descending order
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	sort(by, options = {}) {
		const keys = typeof by === 'string' ? [by] : by;
		const reverse = options.reverse || false;
		const inPlace = options.inPlace || false;
		const sortedData = [...this._data].sort((a, b) => {
			return keys.reduce((acc, key) => {
				if (a[key] == b[key]) return 0;
				if (reverse)
					return acc || (b[key] < a[key] ? -1 : 1);
				return acc || (a[key] < b[key] ? -1 : 1);

			}, 0);
		});
		if (inPlace) {
			this._data = sortedData;
			return this;
		}
		return new DataFrame(sortedData);
	}

	/**
	* Displays the DataFrame
	*/
	show() {
		const MAX_WIDTH = 42;
		const MAX_LENGTH = 25;
		const NB_COLS = 180;

		const widths = [
			Math.min(MAX_LENGTH.toString().length, this.length.toString().length),
			...this._columns
				.map(column => Math.max(column.length, d3.max(this._data, d => d && d[column] ? d[column].toString().length : 0)))
				.map(width => width > MAX_WIDTH ? MAX_WIDTH : width)
		];

		const computeWidth = (index) => {
			return d3.sum(widths.slice(0, index + 1)) + 3 * index;
		}

		const visibleColumns = this._columns.filter((column, index) => computeWidth(index + 1) <= NB_COLS);

		const lines = [];
		lines.push([
			''.padEnd(widths[0]),
			...visibleColumns.map((column, index) => column.padStart(widths[index + 1]))
		].join(' | '));
		lines.push(
			'='.repeat(computeWidth(visibleColumns.length))
			+ (visibleColumns.length < this._columns.length ? ' ...' : '')
		);
		this._data.slice(0, MAX_LENGTH).forEach((row, index) => {
			const line = [
				index.toString().padEnd(widths[0]),
				...visibleColumns.map((column, index) => {
					const cell = row[column] || 'N/A';
					return cell.length > MAX_WIDTH
						? `${cell.substr(0, MAX_WIDTH - 3)}...`
						: cell.padStart(widths[index + 1]);
				})
			].join(' | ');
			lines.push(line);
		});
		if (this.length > MAX_LENGTH) lines.push('...');
		lines.push('');
		lines.push(`Total length: ${this.length}`);
		lines.push(`Columns: ${this._columns.join(', ')}`);
		lines.push('');
		console.log(lines.join('\n'));
	}

	/**
	* Saves the DataFrame as a CSV file
	* @param {string} path Path of the file to save
	* @param {Object} [options] Options
	* @param {string} [options.delimiter=','] Delimiter to use
	*/
	saveCSV(path, options = {}) {
		const delimiter = options.delimiter || ',';
		let content = this._columns
			.map(column => column.includes(delimiter) ? JSON.stringify(column) : column)
			.join(delimiter);
		content += '\n';
		this._data.forEach(row => {
			content += this._columns
				.map(column => row[column] && row[column].includes(delimiter)
					? JSON.stringify(row[column])
					: row[column]
				)
				.join(delimiter);
			content += '\n';
		});
		fs.writeFileSync(path, content);
	}

	/**
	* Saves the DataFrame as a JSON file
	* @param {string} path Path of the file to save
	* @param {Object} [options] Options
	* @param {boolean} [options.prettify=true] Prettify JSON output
	*/
	saveJSON(path, options = {}) {
		const prettify = options.prettify;
		fs.writeFileSync(path, JSON.stringify(this._data, null, prettify ? '\t' : null));
	}

}
