'use strict';

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
			this._data.forEach(row => {
				Object.entries(row).forEach(([key, value]) => {
					if (value && typeof value !== 'boolean' && !Number.isNaN(+value))
						row[key] = +value;
				});
			});
			this._columns = Array.from(
				new Set(this._data.reduce((acc, row) => {
					return [...acc, ...Object.keys(row)];
				}, []))
			);
		}
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
					[column]: row[column] !== undefined
						? row[column]
						: index < this._columns.length ? row[this._columns[index]] : null
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
	* @example
	* // Returns the row at index 4
	* df.get(4);
	*/
	get(index) {
		Validator.integer('DataFrame.get()', 'index', index, { range: [0, this.length - 1] });
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
	* Returns a specific row in the DataFrame
	* @param {callback} condition The returned row is the first one that matches this condition
	* @returns {Object}
	* @example
	* // Returns the row where the 'name' is 'Marvin'
	* df.find(row => row.name === 'Marvin');
	*/
	find(condition) {
		Validator.function('DataFrame.find()', 'condition', condition);

		const df = this.filter(condition);
		return !df.empty ? df.get(0) : undefined;
	}

	/**
	* Sets the content of a cell in the DataFrame
	* @param {number} index
	* @param {string} column
	* @param {*} value
	* @example
	* // Sets the value for 'name' on the 42nd row to 'Slartibartfast'
	* df.set(42, 'name', 'Slartibartfast');
	*/
	set(index, column, value) {
		Validator.integer('DataFrame.set()', 'index', index, { range: [0, this.length - 1] });
		Validator.string('DataFrame.set()', 'column', column, { enum: this._columns });
		this._data[index][column] = value;
		this[column].set(index, value);
	}

	/**
	* Returns a new DataFrame containing the first N rows of the DataFrame
	* @param {number} [n=5] Number of rows to select
	* @returns {DataFrame}
	* @example
	* // Returns a new DataFrame with the first 10 rows
	* df.head(10);
	*/
	head(n = 5) {
		Validator.integer('DataFrame.head()', 'n', n);
		return this.slice(0, n);
	}

	/**
	* Returns a new DataFrame containing the last N rows of the DataFrame
	* @param {number} [n=5] Number of rows to select
	* @returns {DataFrame}
	* @example
	* // Returns a new DataFrame with the last 5 rows
	* df.tail();
	*/
	tail(n = 5) {
		Validator.integer('DataFrame.tail()', 'n', n);
		return this.slice(-n);
	}

	/**
	* Returns a new DataFrame with a slice of the original rows
	* @param {number} start Zero-based index at which to start extraction
	* @param {number} [end=DataFrame.length] Zero-based index before which to end extraction
	* @returns {DataFrame}
	* @example
	* // Returns a new DataFrame with rows starting at index 10
	* df.slice(10);
	* // Returns a new DataFrame with rows between index 24 (included) and 42 (excluded)
	* df.slice(24, 42);
	*/
	slice(start, end = this.length) {
		Validator.integer('DataFrame.slice()', 'start', start);
		Validator.integer('DataFrame.slice()', 'end', end);
		return new DataFrame(this._data.slice(start, end));
	}

	/**
	* Returns the rows of the DataFrame as an iterable
	* @returns {Iterable.<Object>}
	* @example
	* for (let row of df.rows()) {
	*   console.log(row);
	* }
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
	* @example
	* for (let [index, row] of df.items()) {
	*   console.log(index, row);
	* }
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
	* @example
	* // Displays each element in the 'name' column of the DataFrame
	* df.forEach(row => console.log(row.name));
	*/
	forEach(callback) {
		Validator.function('DataFrame.forEach()', 'callback', callback);
		this._data.forEach(callback);
		this.columns = this._columns;
	}

	/**
	* Returns a new Series populated with the results of a callback function applied on each row the DataFrame
	* @param {callback} callback
	* @returns {Series}
	* @example
	* // Returns a Series of full names by joining the name and surname for each row of the DataFrame
	* df.map(row => [row.name, row.surname].join(' '));
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
	* @example
	* // Replaces all occurrences of 'panda' with 'kiwi' in the column 'animal'
	* df.replace('panda', 'kiwi', { inPlace: true, columns: 'animal' });
	*/
	replace(oldValue, newValue, options = {}) {
		Validator.options('DataFrame.replace()', options, [
			{ key: 'inPlace', type: 'boolean' },
			{ key: 'columns', type: 'string|string[]', enum: this._columns }
		]);

		const inPlace = options.inPlace || false;
		const columns = options.columns
			? (Array.isArray(options.columns) ? options.columns : [options.columns])
			: this._columns;

		const df = inPlace ? this : this.clone();
		df._data = df._data.map(row => this._columns.reduce((acc, column) => {
			const cell = columns.includes(column) && row[column] === oldValue
				? newValue : row[column];
			return {
				...acc,
				[column]: cell
			};
		}, {}));
		df._defineColumnProperties();
		return df;
	}

	/**
	* Appends new rows to a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to append to the DataFrame
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Adds new columns to the DataFrame if they do not already exist
	* @returns {DataFrame}
	* @example
	* const rows = [
	*   {
	*     name: 'Marvin',
	*     occupation: 'Robot'
	*   },
	*   {
	*     name: 'Zaphod Beeblebrox',
	*     occupation: 'President of the Galaxy'
	*   }
	* ];
	* df.append(rows, { extend: true });
	*/
	append(rows, options = {}) {
		Validator.options('DataFrame.append()', options, [
			{ key: 'extend', type: 'boolean' }
		]);

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
		});
		this.columns = newColumns;
		return this;
	}

	/**
	* Inserts new rows into a DataFrame
	* @param {Object|Object[]} rows Row or array of rows to insert into the DataFrame
	* @param {number} [index=0] Index to insert the rows at
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Adds new columns to the DataFrame if they do not already exist
	* @returns {DataFrame}
	* @example
	* // Inserts a new row at index 2 in the DataFrame
	* df.insert({ name: 'Trillian', species: 'human' }, 2, { extend: true });
	*/
	insert(rows, index = 0, options = {}) {
		Validator.integer('DataFrame.insert()', 'index', index, { range: [0, this.length - 1] });
		Validator.options('DataFrame.insert()', options, [
			{ key: 'extend', type: 'boolean' }
		]);

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
				[column]: !this._kw.isNA(row[column], { keep: [0, false, ''] }) ? row[column] : null
			}), {}));
			index++;
		});
		this.columns = newColumns;
		return this;
	}

	/**
	* Concatenates another DataFrame to the DataFrame
	* @param {DataFrame} other
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] Adds new columns to the DataFrame if they do not already exist
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Concatenates df1 and df2, adding columns from df2 into df1 if they do not exist
	* df1.concat(df2, { inPlace: true, extend: true });
	*/
	concat(other, options = {}) {
		Validator.instanceOf('DataFrame.concat()', 'other', other, 'DataFrame', DataFrame);
		Validator.options('DataFrame.concat()', options, [
			{ key: 'extend', type: 'boolean' },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const inPlace = options.inPlace || false;

		if (inPlace)
			return this.append(other.toArray(), options);
		const df = this.clone();
		df.append(other.toArray(), options);
		return df;
	}

	/**
	* Performs a join of two DataFrames on a given column
	* @param {DataFrame} other
	* @param {string} column Column to join the DataFrames on
	* @param {Object} [options]
	* @param {('inner'|'outer'|'left'|'right')} [options.how='inner'] How the DataFrames should be joined: `'inner'` only keeps the intersection of the rows, `'outer'` keeps the union of the rows, `'left'` only keeps rows from the current DataFrame, and `'right'` only keeps rows from the `other` DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Joins DataFrames df1 and df2 along their column 'id', keeping only the rows from df1
	* df1.join(df2, 'id', { inPlace: true, how: 'left' });
	*/
	join(other, column, options = {}) {
		Validator.instanceOf('DataFrame.join()', 'other', other, 'DataFrame', DataFrame);
		Validator.string('DataFrame.join()', 'column', column, {
			enum: this._columns.filter(column => other._columns.includes(column))
		});
		Validator.options('DataFrame.join()', options, [
			{ key: 'how', type: 'string', enum: ['inner', 'outer', 'left', 'right'] },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const how = options.how || 'inner';
		const inPlace = options.inPlace || false;

		const getNewData = (data, otherData) => {
			return data.reduce((acc, row) => {
				const otherRow = otherData.find(otherRow => row[column] === otherRow[column]);
				if (otherRow !== undefined) {
					return [
						...acc,
						Object.entries(otherRow).reduce((acc, [key, value]) => ({
							...acc,
							[key]: value
						}), row)
					];
				}
				if (how === 'inner') return acc;
				return [...acc, row];
			}, []);
		}

		let newData;
		switch(how) {
			case 'inner':
				newData = getNewData(this._data, other._data);
				break;
			case 'left':
				newData = getNewData(this._data, other._data);
				break;
			case 'right':
				newData = getNewData(other._data, this._data);
				break;
			case 'outer':
				newData = [...getNewData(this._data, other._data), ...getNewData(other._data, this._data)];
				break;
		}

		if (!inPlace)
			return new DataFrame(newData).dropDuplicates();

		this._data = newData;
		this.columns = Array.from(new Set([...this._columns, ...other._columns]));
		return this.dropDuplicates();
	}

	/**
	* Adds a new column to the DataFrame
	* @param {string} name Name of the new column
	* @param {(*|*[]|Series)} column Content of the new column as an array, a Series or any value (to be set on every rows)
	* @param {Object} [options]
	* @param {boolean} [options.extend=false] If the new column is not the same length as the DataFrame, extends the DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Adds a new column 'fullName' by applying a function on the DataFrame
	* df.addColumn(
	*   'fullName',
	*   df.map(row => [row.name, row.surname].join(' ')),
	*   { inPlace: true }
	* );
	*
	* // Adds a new column 'species', with 'human' on every rows
  	* df.addColumn('species', 'human', { inPlace: true });
	*/
	addColumn(name, column, options = {}) {
		Validator.string('DataFrame.addColumn()', 'name', name, { not: this._columns });
		Validator.options('DataFrame.addColumn()', options, [
			{ key: 'extend', type: 'boolean' },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const data = column instanceof Series
			? column.toArray()
			: (Array.isArray(column) ? column : new Array(this.length).fill(column));
		const extend = options.extend || false;
		const inPlace = options.inPlace || false;

		const newData = this._data.map((row, index) => {
			return {
				...row,
				[name]: index < data.length ? data[index] : null
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
			this._data = newData;
			this.columns = [...this._columns, name];
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
	* @example
	* // Renames column 'occupation' into 'job'
	* df.rename({ occupation: 'job' }, { inPlace: true });
	*/
	rename(map, options = {}) {
		Validator.options('DataFrame.rename()', options, [
			{ key: 'inPlace', type: 'boolean' }
		]);

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
	* @example
	* console.log(df.columns) // ['occupation', 'species', 'name']
	* df.reorder(['name', 'occupation', 'species'], { inPlace: true });
	* console.log(df.columns) // ['name', 'occupation', 'species']
	*/
	reorder(names, options = {}) {
		Validator.array('DataFrame.reorder()', 'names', names, { type: 'string' });
		Validator.options('DataFrame.reorder()', options, [
			{ key: 'inPlace', type: 'boolean' }
		]);
		if (names.length !== this._columns.length || names.some(e => !this._columns.includes(e)))
			throw new Error('Invalid argument in DataFrame.reorder(): \'names\' must contain the same column names as the DataFrame');

		const inPlace = options.inPlace || false;

		if (inPlace) {
			this._columns = names;
			return this;
		}
		const df = this.clone();
		df._columns = names;
		return df;
	}

	/**
	* Drops N/A values from the DataFrame
	* @param {Object} [options]
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether rows or columns should be dropped
	* @param {*[]} [options.keep=[0, false]] Array of falsy values to keep in the DataFrame
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Drops all rows containg N/A values
	* df.dropNA({ inPlace: true });
	* // Drops all columns containing N/A values (but keeps empty strings as well as 0 and false)
	* df.dropNA({ axis: 'columns', keep: [0, false, ''], inPlace: true });
	*/
	dropNA(options = {}) {
		Validator.options('DataFrame.dropNA()', options, [
			{ key: 'axis', type: 'string', enum: ['rows', 'columns'] },
			{ key: 'keep', type: '*[]' },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const axis = options.axis || 'rows';
		const keep = options.keep || [0, false];

		if (axis === 'rows') {
			return this.filter(
				row => Object.values(row).every(e => Boolean(e) || keep.includes(e)),
				{ inPlace: options.inPlace, axis: options.axis }
			);
		}
		else {
			return this.filter(
				column => this[column].all(e => Boolean(e) || keep.includes(e)),
				{ inPlace: options.inPlace, axis: options.axis }
			);
		}
	}

	/**
	* Drops duplicate rows from the DataFrame
	* @param {Object} [options]
	* @param {(string|string[])} [options.columns=DataFrame.columns] Column or array of columns to consider for comparison
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Drops duplicate rows with similar values for 'name'
	* df.dropDuplicates({ columns: 'name', inPlace: true });
	*/
	dropDuplicates(options = {}) {
		Validator.options('DataFrame.dropDuplicates()', options, [
			{ key: 'columns', type: 'string|string[]', enum: this._columns },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const columns = options.columns
			? (Array.isArray(options.columns) ? options.columns : [options.columns])
			: this.columns;
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
	* Filters columns or rows of the DataFrame
	* @param {(callback|string[])} filter Can be a callback (applied to rows or columns) or an array of column names to keep
	* @param {Object} [options]
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether the callback should apply to rows or columns
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Only keeps the 'date' and 'url' columns
	* df.filter(['date', 'url'], { inPlace: true });
	* // Only keeps rows whose date is 4/20/20
	* df.filter(row => row.date === '2020-04-20', { inPlace: true });
	* // Only keeps columns whose name contains 'data'
	* df.filter(column => column.includes('data'), { axis: 'columns', inPlace: true });
	*/
	filter(filter, options = {}) {
		Validator.options('DataFrame.filter()', options, [
			{ key: 'axis', type: 'string', enum: ['rows', 'columns'] },
			{ key: 'inPlace', type: 'boolean' }
		]);

		const axis = options.axis || 'rows';
		const inPlace = options.inPlace || false;

		if (typeof filter !== 'function') {
			Validator.array('DataFrame.filter()', 'filter', filter, {
				type: 'string',
				enum: this._columns
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
	* // Removes the 'date' and 'url' columns
	* df.drop(['date', 'url'], { inPlace: true });
	* // Removes all rows whose date is 4/20/20
	* df.drop(row => row.date === '2020-04-20', { inPlace: true });
	* // Removes columns whose name contains 'data'
	* df.drop(column => column.includes('data'), { axis: 'columns', inPlace: true });
	*/
	drop(filter, options = {}) {
		Validator.options('DataFrame.drop()', options, [
			{ key: 'axis', type: 'string', enum: ['rows', 'columns'] },
			{ key: 'inPlace', type: 'boolean' }
		]);

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
	* @example
	* // Sorts the DataFrame alphabetically by 'name'
	* df.sort('name', { inPlace: true });
	* // Sorts the DataFrame in descending ordr by 'age'
	* df.sort('age', { reverse: true, inPlace: true });
	*/
	sort(by, options = {}) {
		const keys = typeof by === 'string' ? [by] : by;
		Validator.array('DataFrame.sort()', 'by', keys, { type: 'string', enum: this._columns });
		Validator.options('DataFrame.sort()', options, [
			{ key: 'reverse', type: 'boolean' },
			{ key: 'inPlace', type: 'boolean' }
		]);

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
	* @param {('rows'|'columns')} [options.axis='rows'] Determines whether rows or columns should be shuffled
	* @param {boolean} [options.inPlace=false] Changes the current DataFrame instead of returning a new one
	* @returns {DataFrame}
	* @example
	* // Shuffles the columns of the DataFrame
	* df.shuffle({ axis: 'columns', inPlace: true });
	*/
	shuffle(options = {}) {
		Validator.options('DataFrame.shuffle()', options, [
			{ key: 'axis', type: 'string', enum: ['rows', 'columns'] },
			{ key: 'inPlace', type: 'boolean' }
		]);

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
	* @param {(string|string[])} columns Column or array of columns to pivot along
	* @returns {PivotTable}
	* @example
	* // Returns a PivotTable along columns 'sector' and 'date'
	* df.pivot(['sector', 'date']);
	*/
	pivot(columns) {
		const pivots = Array.isArray(columns) ? columns : [columns];

		Validator.array('DataFrame.pivot()', 'columns', pivots, { type: 'string', enum: this._columns });

		return new PivotTable(this, pivots);
	}

	/**
	* Formats the DataFrame for display
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
	* @example
	* df.toCSV('myAwesomeData.csv'); // to CSV
	* df.toCSV('myAwesomeData.tsv', { delimiter: '\t' }); // to TSV
	*/
	toCSV(path = null, options = {}) {
		Validator.options('DataFrame.toCSV()', options, [
			{ key: 'delimiter', type: 'string' }
		]);

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
		eval('require')('fs').writeFileSync(path, content);
	}

	/**
	* Exports the DataFrame as JSON
	* @param {string} [path=null] Path of the file to save
	* @param {Object} [options]
	* @param {boolean} [options.prettify=true] Prettify JSON output
	* @returns {string|undefined} A JSON string if `path` is not set
	* @example
	* df.toJSON('myAwesomeData.json');
	*/
	toJSON(path, options = {}) {
		Validator.options('DataFrame.toJSON()', options, [
			{ key: 'prettify', type: 'boolean' }
		]);

		const prettify = options.prettify !== undefined ? options.prettify : true;

		const content = JSON.stringify(this._data, null, prettify ? '\t' : null);
		if (!path) return content;
		eval('require')('fs').writeFileSync(path, content);
	}

}

module.exports = DataFrame;
