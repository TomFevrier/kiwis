import fs from 'fs';
import d3 from 'd3-array';

import Kiwis from './Kiwis.js';
import Series from './Series.js';

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
		if (!data || data.length === 0) {
			this._data = [];
			this._columns = [];
		}
		else if (data instanceof DataFrame) {
			this._data = data._data;
			this._columns = data._columns;
		}
		else {
			this._data = Array.from(JSON.parse(JSON.stringify(data)));
			this._columns = data.columns || Array.from(Object.keys(this._data[0]));
		}
		this._data.forEach((row, index) => this._defineRowProperty(index));
		this._defineColumnProperties();
	}

	_defineColumnProperties() {
		this._columns.forEach(column => {
			Object.defineProperty(this, column, {
				value: new Series(this._data.map(e => e[column])),
				configurable: true,
				enumerable: true
			});
		});
	}

	_defineRowProperty(index) {
		Object.defineProperty(this, index, {
			value: this._data[index],
			configurable: true
		});
	}

	get length() {
		return this._data.length;
	}

	get columns() {
		return this._columns;
	}

	set columns(newColumns) {
		// Check for uniqueness of names
		if (new Set(newColumns).length < newColumns.length)
			throw new Error('Multiple columns cannot have the same name');

		// Update data
		this._data = this._data.map(row => {
			return newColumns.reduce((newRow, column, index) => {
				return {
					...newRow,
					[column]: index < this._columns.length ? row[this._columns[index]] : null
				}
			}, {});
		});

		// Delete old properties
		this._columns.forEach(column => delete this[column]);

		// Change the list of columns
		this._columns = newColumns;

		// Add new properties
		this._defineColumnProperties();
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
	* Appends new rows to a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to append to the DataFrame
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Add new columns to the DataFrame if they do not exist
	* @returns {DataFrame}
	*/
	append(rows, options = {}) {
		const data = Array.isArray(rows) ? rows : [rows];
		const extend = options.extend || false;
		if (extend) {
			let newColumns = [];
			data.forEach(row => {
				const newKeys = Object.keys(row)
					.filter(key => !this._columns.includes(key) && !newColumns.includes(key));
				if (newKeys.length > 0)
					newColumns = [...newColumns, ...newKeys];
			});
			this.columns = [...this._columns, ...newColumns];

		}
		data.forEach(row => {
			this._data.push(this._columns.reduce((acc, column) => ({
				...acc,
				[column]: !Kiwis.isNA(row[column], { keep: [0, false, ''] }) ? row[column] : null
			}), {}));
			this._defineRowProperty(this._data.length - 1);
		});
		return this;
	}

	/**
	* Inserts new rows into a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to insert into the DataFrame
	* @param {number} [index=0] Index to insert the rows at
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Add new columns to the DataFrame if they do not exist
	* @returns {DataFrame}
	*/
	insert(rows, index = 0, options = {}) {
		const data = Array.isArray(rows) ? rows : [rows];
		const extend = options.extend || false;
		if (extend) {
			let newColumns = [];
			data.forEach(row => {
				const newKeys = Object.keys(row)
					.filter(key => !this._columns.includes(key) && !newColumns.includes(key));
				if (newKeys.length > 0)
					newColumns = [...newColumns, ...newKeys];
			});
			this.columns = [...this._columns, ...newColumns];

		}
		data.forEach(row => {
			this._data.splice(index, 0, this._columns.reduce((acc, column) => ({
				...acc,
				[column]: !Kiwis.isNA(row[column], { keep: [0, false, ''] }) ? row[column] : 'truc'
			}), {}));
			this._defineRowProperty(this._data.length - 1);
			index++;
		});
		return this;
	}

	/**
	* Drops N/A values from the DataFrame
	* @param {Object} [options]
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether rows or columns should be dropped
	* @param {*[]} [options.keep=[0, false]] Array of falsy values to keep in the DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	dropNA(options = {}) {
		if (options.axis && !['rows', 'columns'].includes(options.axis))
			throw new Error(`Invalid value '${options.axis}' for the 'axis' option`);
		const axis = options.axis || 'rows';
		const keep = options.keep || [0, false];
		if (axis === 'rows') {
			return this.filter(
				row => Object.values(row).every(e => Boolean(e) || keep.includes(e)),
				options
			);
		}
		else {
			return this.filter(
				column => this._data.map(row => row[column]).every(e => Boolean(e) || keep.includes(e)),
				options
			);
		}
	}

	/**
	* Drops duplicate rows from the DataFrame
	* @param {string[]} [columns=DataFrame.columns] Array of columns to consider for comparison
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	dropDuplicates(columns = this.columns, options = {}) {
		const inPlace = options.inPlace || false;

		const rowsToDrop = [];
		this._data.forEach((rowA, indexA) => {
			const valuesA = Object.values(columns.reduce((acc, column) => ({
				...acc,
				[column]: rowA[column]
			}), {}));
			this._data.slice(indexA + 1).forEach((rowB, index) => {
				const indexB = indexA + 1 + index;
				if (rowsToDrop.includes(indexA) || rowsToDrop.includes(indexB)) return;
				const valuesB = Object.values(columns.reduce((acc, column) => ({
					...acc,
					[column]: rowB[column]
				}), {}));
				if (JSON.stringify(valuesA) === JSON.stringify(valuesB))
					rowsToDrop.push(indexB);
			});
		});
		if (inPlace) {
			rowsToDrop.sort((a, b) => b - a).forEach(index => {
				this._data.splice(index, 1);
			});
			return this;
		}
		const df = this.clone();
		rowsToDrop.sort((a, b) => b - a).forEach(index => {
			df._data.splice(index, 1);
		});
		return df;
	}

	/**
	* Add a new column to the DataFrame
	* @param {string} name Name of the new column
	* @param {(*|*[]|Series)} column Content of the new column as an array, a Series or any value (to be set on every rows)
	* @param {Object} [options]
	* @param {('auto'|'extend'|'trim')} [options.fit='auto'] If the new column is not the same length as the DataFrame: drop the extra rows (`'auto'`, length stays the same), extends the DataFrame (`'extend'`, length is that of the new column), trim the DataFrame (`'trim'`, length is that of the new column)
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	addColumn(name, column, options = {}) {
		if (options.fit && !['auto', 'extend', 'trim'].includes(options.fit))
			throw new Error(`Invalid value '${options.fit}' for the 'fit' option`);
		const fit = options.fit || 'auto';
		const inPlace = options.inPlace || false;
		const data = column instanceof Series
			? column.toArray()
			: (Array.isArray(column) ? column : new Array(this.length).fill(column));
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
			this.columns = [...this._columns, name];
			this._data = newData;
			return this;
		}
		return new DataFrame(newData);
	}

	/**
	* Rename columns of the DataFrame
	* @param {Object<key, string>} map Map of the columns to rename to their new names
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	rename(map, options = {}) {
		const inPlace = options.inPlace || false;
		const newColumns = this._columns.map(column => {
			return Object.keys(map).includes(column)
				? map[column] : column;
		});
		if (inPlace) {
			this.columns = newColumns;
			return this;
		}
		const df = this.clone();
		df.columns = newColumns;
		return df;
	}

	/**
	* Reorder the columns of the DataFrame
	* @param {string[]} names Array containing the new order of the columns
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	reorder(names, options = {}) {
		const inPlace = options.inPlace || false;
		if (names.length !== this._columns.length || !names.every(e => this._columns.includes(e)))
			throw new Error('\'names\' must contain the same column names as the DataFrame');
		if (inPlace) {
			this._columns = names;
			return this;
		}
		const df = this.clone();
		df._columns = names;
		return df;
	}

	/**
	* Filters columns or rows of the DataFrame
	* @param {(callback|string[])} filter Can be a callback (applied to rows or columns) or an array of column names to keep
	* @param {Object} [options]
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether the callback should apply to rows or columns
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	filter(filter, options = {}) {
		if (options.axis && !['rows', 'columns'].includes(options.axis))
			throw new Error(`Invalid value '${options.axis}' for the 'axis' option`);
		const axis = options.axis || 'rows';
		const inPlace = options.inPlace || false;

		if (typeof filter !== 'function') {
			filter.forEach(column => {
				if (!this._columns.includes(column))
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
			this._columns = this._columns.filter(column => columnsToKeep.includes(column));
			return this;
		}
		return new DataFrame(filteredData);
	}

	/**
	* Drops columns or rows from the DataFrame
	* @param {(callback|string[])} filter Can be a callback (applied to rows or columns) or an array of column names to drop
	* @param {Object} [options]
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether the callback should apply to rows or columns
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	drop(filter, options = {}) {
		if (options.axis && !['rows', 'columns'].includes(options.axis))
			throw new Error(`Invalid value '${options.axis}' for the 'axis' option`);
		if (typeof filter === 'function')
			return this.filter(e => !filter(e), options);
		return this.filter(this._columns.filter(column => !filter.includes(column)), options);
	}

	/**
	* Sorts the DataFrame
	* @param {(string|string[])} by Key or array of keys to sort the DataFrame by
	* @param {Object} [options]
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
	* Shuffles the rows or columns of a DataFrame
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether rows or columns should be shuffled
	* @returns {DataFrame}
	*/
	shuffle(options = {}) {
		if (options.axis && !['rows', 'columns'].includes(options.axis))
			throw new Error(`Invalid value '${options.axis}' for the 'axis' option`);
		const inPlace = options.inPlace || false;
		const axis = options.axis || 'rows';
		if (axis === 'rows') {
			if (inPlace) {
				this._data.sort(() => Math.random() - 0.5);
				return this;
			}
			const df = this.clone();
			df._data.sort(() => Math.random() - 0.5);
			return df;
		}
		if (inPlace) {
			this._columns.sort(() => Math.random() - 0.5);
			return this;
		}
		const df = this.clone();
		df._columns.sort(() => Math.random() - 0.5);
		return df;
	}

	/**
	* Displays the DataFrame
	* @returns {DataFrame}
	*/
	show() {
		if (this.empty) {
			console.log('Empty DataFrame\n');
			return this;
		}

		const MAX_WIDTH = 42;
		const MAX_LENGTH = 25;
		const NB_COLS = 180;

		const widths = [
			Math.min(MAX_LENGTH.toString().length, this.length.toString().length),
			...this._columns
				.map(column => Math.max(
					column.length,
					d3.max(this._data, d => !Kiwis.isNA(d[column]) ? d[column].toString().length : 0))
				)
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
					const cell = !Kiwis.isNA(row[column]) ? row[column].toString() : 'N/A';
					return cell.length > MAX_WIDTH
						? `${cell.substr(0, MAX_WIDTH - 3)}...`
						: cell.padStart(widths[index + 1]);
				})
			].join(' | ');
			lines.push(line);
		});
		if (this.length > MAX_LENGTH) lines.push('...');
		lines.push('');
		lines.push(`[${this.length} rows × ${this._columns.length} columns]`);
		lines.push(`Columns: ${this._columns.join(', ')}`);
		lines.push('');
		console.log(lines.join('\n'));
		return this;
	}

	/**
	* Saves the DataFrame as a CSV file
	* @param {string} path Path of the file to save
	* @param {Object} [options]
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
				.map(column => !Kiwis.isNA(row[column]) && row[column].toString().includes(delimiter)
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
	* @param {Object} [options]
	* @param {boolean} [options.prettify=true] Prettify JSON output
	*/
	saveJSON(path, options = {}) {
		const prettify = options.prettify;
		fs.writeFileSync(path, JSON.stringify(this._data, null, prettify ? '\t' : null));
	}

}
