'use strict';

const fs = require('fs');
const d3 = require('d3-array');

const Series = require('./Series.js');
const PivotTable = require('./PivotTable.js');

const Validator = require('./Validator.js');


/**
* @class
* @property {number} length The number of rows in the DataFrame
* @property {boolean} empty Whether the DataFrame contains any row or not
* @property {string[]} columns The columns of the DataFrame
*/

class DataFrame {

	/**
	* @function callback
	* @param {Object} currentElement
	* @param {number} index
	*/

	/**
	* @constructor
	* @hideconstructor
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
		// this._data.forEach((row, index) => this._defineRowProperty(index));
		this._defineColumnProperties();

		this._kw = require('./Kiwis.js');
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

	// _defineRowProperty(index) {
	// 	Object.defineProperty(this, index, {
	// 		value: this._data[index],
	// 		configurable: true
	// 	});
	// }

	get length() {
		return this._data.length;
	}

	get empty() {
		return this._data.length === 0;
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
				};
			}, {});
		});

		// Delete old properties
		this._columns.forEach(column => delete this[column]);

		// Change the list of columns
		this._columns = newColumns;

		// Add new properties
		this._defineColumnProperties();
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
	* Returns any row of the DataFrame
	* @param {number} index
	* @returns {Object}
	*/
	get(index) {
		Validator.int('DataFrame.get()', 'index', index, { range: [0, this.length - 1] });
		return this._data[index];
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
		Validator.int('DataFrame.head()', 'n', n);
		return this.slice(0, n);
	}

	/**
	* Returns a new DataFrame containing the last N rows of the DataFrame
	* @param {number} [n=5] Number of rows to select
	* @returns {DataFrame}
	*/
	tail(n = 5) {
		Validator.int('DataFrame.tail()', 'n', n);
		return this.slice(-n);
	}

	/**
	* Returns a new DataFrame with a slice of the original rows
	* @param {number} start Zero-based index at which to start extraction
	* @param {number} [end=DataFrame.length] Zero-based index before which to end extraction
	* @returns {DataFrame}
	* @example
	* // Returns a new DataFrame with rows starting at index 10
	* df.slice(10)
	* // Returns a new DataFrame with rows between index 24 (included) and 42 (excluded)
	* df.slice(24, 42)
	*/
	slice(start, end) {
		Validator.int('DataFrame.slice()', 'start', start);
		Validator.int('DataFrame.slice()', 'end', end);
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
		};
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
		};
	}

	/**
	* Applies a callback function to each row of the DataFrame
	* @param {callback} callback
	*/
	forEach(callback) {
		this._data.forEach(callback);
	}

	/**
	* Returns a new Series populated with the results of a callback function applied on each row the DataFrame
	* @param {callback} callback
	* @returns {Series}
	*/
	map(callback) {
		Validator.function('DataFrame.map()', 'callback', callback);
		return new Series(this._data.map(callback));
	}

	/**
	* Replaces all occurences of the given value in the DataFrame by another value
	* @param {*} oldValue
	* @param {*} newValue
	* @param {Object} [options]
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @param {(string|string[])} [options.columns=DataFrame.columns] Columns to replace into
	* @returns {DataFrame}
	*/
	replace(oldValue, newValue, options = {}) {
		Validator.options('DataFrame.replace()', options, [ { key: 'inPlace', type: 'boolean' }, { key: 'columns', type: ['string', 'string[]'] } ])

		const inPlace = options.inPlace || false;
		const columns = options.columns
			? (Array.isArray(options.columns) ? options.columns : [options.columns])
			: this._columns;

		const df = inPlace ? this : this.clone();
		df._data = df._data.map(row => this._columns.reduce((acc, column) => {
			console.log(row[column])
			const cell = columns.includes(column) && row[column] === oldValue
				? newValue : row[column];
			return {
				...acc,
				[column]: cell
			};
		}, {}));
		return df;
	}

	/**
	* Appends new rows to a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to append to the DataFrame
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Add new columns to the DataFrame if they do not already exist
	* @returns {DataFrame}
	*/
	append(rows, options = {}) {
		const data = Array.isArray(rows) ? rows : [rows];
		const extend = options.extend || false;
		let newColumns = [...this._columns];
		if (extend) {
			data.forEach(row => {
				const newKeys = Object.keys(row)
					.filter(key => !this._columns.includes(key) && !newColumns.includes(key));
				if (newKeys.length > 0)
					newColumns = [...newColumns, ...newKeys];
			});
		}
		data.forEach(row => {
			this._data.push(newColumns.reduce((acc, column) => ({
				...acc,
				[column]: !this._kw.isNA(row[column], { keep: [0, false, ''] }) ? row[column] : null
			}), {}));
			// this._defineRowProperty(this._data.length - 1);
		});
		this.columns = newColumns;
		return this;
	}

	/**
	* Inserts new rows into a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to insert into the DataFrame
	* @param {number} [index=0] Index to insert the rows at
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Add new columns to the DataFrame if they do not already exist
	* @returns {DataFrame}
	*/
	insert(rows, index = 0, options = {}) {
		const data = Array.isArray(rows) ? rows : [rows];
		const extend = options.extend || false;
		let newColumns = [...this._columns];
		if (extend) {
			data.forEach(row => {
				const newKeys = Object.keys(row)
					.filter(key => !this._columns.includes(key) && !newColumns.includes(key));
				if (newKeys.length > 0)
					newColumns = [...newColumns, ...newKeys];
			});
		}
		data.forEach(row => {
			this._data.splice(index, 0, newColumns.reduce((acc, column) => ({
				...acc,
				[column]: !this._kw.isNA(row[column], { keep: [0, false, ''] }) ? row[column] : 'truc'
			}), {}));
			// this._defineRowProperty(this._data.length - 1);
			index++;
		});
		this.columns = newColumns;
		return this;
	}

	/**
	* Concats another DataFrame to the DataFrame
	* @param {DataFrame} other
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Add new columns to the DataFrame if they do not already exist
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	concat(other, options = {}) {
		const inPlace = options.inPlace || false;
		if (inPlace)
			return this.append(other.toArray(), options);
		const df = this.clone();
		df.append(other.toArray(), options);
		return df;
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
				column => this[column].all(e => Boolean(e) || keep.includes(e)),
				options
			);
		}
	}

	/**
	* Drops duplicate rows from the DataFrame
	* @param {Object} [options]
	* @param {string[]} [options.columns=DataFrame.columns] Array of columns to consider for comparison
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	dropDuplicates(options = {}) {
		const columns = options.columns || this.columns;
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
			this.columns = this._columns;
			return this;
		}
		const df = this.clone();
		rowsToDrop.sort((a, b) => b - a).forEach(index => {
			df._data.splice(index, 1);
		});
		df.columns = df._columns;
		return df;
	}

	/**
	* Add a new column to the DataFrame
	* @param {string} name Name of the new column
	* @param {(*|*[]|Series)} column Content of the new column as an array, a Series or any value (to be set on every rows)
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] If the new column is not the same length as the DataFrame, extends the DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	*/
	addColumn(name, column, options = {}) {
		const extend = options.extend || false;
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
		if (extend) {
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
	* @example
	* // Only keep the 'date' and 'url' columns
	* df.filter(['date', 'url'])
	* // Only keep rows whose date is 4/20/20
	* df.filter(row => row.date === '2020-04-20')
	* // Only keep columns whose name contains 'data'
	* df.filter(column => column.includes('data'), { axis: 'columns' })
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

		let columnsToKeep;
		let filteredData;
		if (typeof filter === 'function' && axis === 'rows') {
			columnsToKeep = this._columns;
			filteredData = this._data.filter(filter);
		}
		else {
			columnsToKeep = this._columns.filter(column => {
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
			this.columns = this._columns.filter(column => columnsToKeep.includes(column));
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
	* @example
	* // Remove the 'date' and 'url' columns
	* df.drop(['date', 'url'])
	* // Remove all rows whose date is 4/20/20
	* df.drop(row => row.date === '2020-04-20')
	* // Remove columns whose name contains 'data'
	* df.drop(column => column.includes('data'), { axis: 'columns' })
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
				if (a[key] === b[key]) return 0;
				if (reverse)
					return acc || (b[key] < a[key] ? -1 : 1);
				return acc || (a[key] < b[key] ? -1 : 1);

			}, 0);
		});
		if (inPlace) {
			this._data = sortedData;
			this.columns = this._columns;
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
				this.columns = this._columns;
				return this;
			}
			const df = this.clone();
			df._data.sort(() => Math.random() - 0.5);
			df.columns = df._columns;
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
	* Returns a PivotTable along the given columns
	* @param {string[]} columns Columns to pivot along
	* @returns {PivotTable}
	*/
	pivot(columns) {
		columns.forEach(column => {
			if (!this._columns.includes(column))
				throw new Error(`No column named '${column}'`);
		});
		return new PivotTable(this, columns);
	}

	/**
	* Format the DataFrame for display
	* @returns {string}
	*/
	toString() {
		if (this.empty) {
			return 'Empty DataFrame';
		}

		const MAX_WIDTH = 42;
		const MAX_LENGTH = 25;
		const NB_COLS = 180;

		const widths = [
			Math.min(MAX_LENGTH.toString().length, this.length.toString().length),
			...this._columns
				.map(column => Math.max(
					column.length,
					d3.max(
						this._data.slice(0, MAX_LENGTH),
						d => !this._kw.isNA(d[column]) ? d[column].toString().length : 0
					)
				))
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
					const cell = !this._kw.isNA(row[column]) ? row[column].toString() : 'N/A';
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
		return lines.join('\n');
	}

	/**
	* Displays the DataFrame
	*/
	show() {
		console.log(this.toString());
		console.log();
	}

	/**
	* Exports the DataFrame as CSV
	* @param {string} [path=null] Path of the file to save
	* @param {Object} [options]
	* @param {string} [options.delimiter=','] Delimiter to use
	* @returns {string|undefined} A CSV string if `path` is not set
	*/
	toCSV(path = null, options = {}) {
		const delimiter = options.delimiter || ',';
		let content = this._columns
			.map(column => column.includes(delimiter) ? JSON.stringify(column) : column)
			.join(delimiter);
		content += '\n';
		this._data.forEach(row => {
			content += this._columns
				.map(column => !this._kw.isNA(row[column]) && row[column].toString().includes(delimiter)
					? JSON.stringify(row[column])
					: row[column]
				)
				.join(delimiter);
			content += '\n';
		});
		if (!path) return content;
		fs.writeFileSync(path, content);
	}

	/**
	* Exports the DataFrame as JSON
	* @param {string} [path=null] Path of the file to save
	* @param {Object} [options]
	* @param {boolean} [options.prettify=true] Prettify JSON output
	* @returns {string|undefined} A JSON string if `path` is not set
	*/
	toJSON(path, options = {}) {
		const prettify = options.prettify !== undefined ? options.prettify : true;
		const content = JSON.stringify(this._data, null, prettify ? '\t' : null);
		if (!path) return content;
		fs.writeFileSync(path, content);
	}

}

module.exports = DataFrame;
