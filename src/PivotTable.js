'use strict';

const fs = require('fs');
const d3 = require('d3-array');
const nest = require('d3-collection').nest;
const flatten = require('flat');

const Series = require('./Series.js');

/**
* @class
* @property {number} length The number of rows in the PivotTable
* @property {boolean} empty Whether the PivotTable contains any row or not
* @property {string[]} columns The columns of the PivotTable, starting with the pivots
*/

class PivotTable {

	/**
	* @function callback
	* @param {Object} currentElement
	* @param {number} index
	*/

	/**
	* @constructor
	* @hideconstructor
	* @param {Object[]} entries An array of key/value objects
	* @param {string[]} columns An array of column names
	* @param {DataFrame} df A DataFrame containing the unnested data
	*/
	constructor(df, columns) {
		this._df = df.clone().sort(columns);
		this._pivots = columns;
		this._columns = this._df._columns.filter(column => !this._pivots.includes(column));

		this._kw = require('./Kiwis.js');

		const entries = this._pivots
			.reduce((acc, column) => {
				return acc.key(d => d[column]).sortKeys((a, b) => a - b);
			}, nest())
			.entries(this._df._data);

		const parseEntry = (acc, entry) => {
			const isLeaves = !('key' in entry.values[0] && 'values' in entry.values[0]);
			return {
				...acc,
				[entry.key]: isLeaves
					? this._kw.DataFrame(entry.values).drop(this._pivots)
					: entry.values.reduce(parseEntry, {})
			};
		}
		this._tree = entries.reduce(parseEntry, {});

	}

	get length() {
		return this._df.length;
	}

	get empty() {
		return this._df.length === 0;
	}

	get columns() {
		return [
			...this._pivots,
			this._df._columns.filter(column => !this._pivots.includes(column))
		];
	}

	/**
	* Applies the given callback function on the leaves of the PivotTable, returning a DataFrame
	* @param {callback} callback
	* @param {Object} [options]
	* @param {boolean} [options.name='data'] Name to use for the column in the output DataFrame
	* @returns {DataFrame}
	*/
	rollup(callback, options = {}) {
		const name = options.name || 'data';

		const DataFrame = require('./DataFrame.js');

		const applyToLeaves = (acc, [key, value]) => {
			const data = value instanceof DataFrame
				? callback(value.toArray())
				: Object.entries(value).reduce(applyToLeaves, {});
			return {
				...acc,
				[key]: data
			};
		};

		const rolledUp = Object.entries(this._tree).reduce(applyToLeaves, {});

		const flattened = flatten(rolledUp, { delimiter: '|' });

		const data = Object.entries(flattened).reduce((acc, [key, value]) => {
			const values = [...key.split('|'), value];
			const row = values.reduce((acc, value, index) => ({
				...acc,
				[index < this._pivots.length ? this._pivots[index] : name]: value
			}), {});
			return [...acc, row];
		}, []);

		return new DataFrame(data);
	}

	/**
	* Counts the number of leaves for each branch of the PivotTable
	* @returns {DataFrame}
	*/
	count() {
		return this.rollup(l => l.length, { name: 'count' });
	}

	/**
	* Computes the sum of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	sum(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'sum' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.sum(l, d => d[column]), { name: name });
	}

	/**
	* Computes the minimum value of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	min(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'min' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.min(l, d => +d[column]), { name: name });
	}

	/**
	* Computes the maximum value of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	max(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'max' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.max(l, d => +d[column]), { name: name });
	}

	/**
	* Computes the mean of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	mean(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'mean' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.mean(l, d => +d[column]), { name: name });
	}

	/**
	* Computes the mean of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	median(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'median' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.median(l, d => +d[column]), { name: name });
	}

	/**
	* Computes the standard deviation of a given column of the PivotTable
	* @returns {DataFrame}
	*/
	std(column) {
		if (!this._columns.includes(column))
			throw new Error(`No column named '${column}'`);
		const name = 'std' + column[0].toUpperCase() + column.slice(1);
		return this.rollup(l => d3.deviation(l, d => +d[column]), { name: name });
	}

	/**
	* Format the PivotTable for display
	* @returns {string}
	*/
	toString() {
		if (this.empty) {
			return 'Empty PivotTable';
		}

		const MAX_WIDTH = 42;
		const NB_COLS = 180;

		const MAX_LENGTH_LEAVES = 5;

		const widths = [...this._pivots, ...this._columns]
			.map(column => Math.max(
				column.length,
				d3.max(
					this._df._data,
					d => !this._kw.isNA(d[column]) ? d[column].toString().length : 0
				)
			))
			.map(width => width > MAX_WIDTH ? MAX_WIDTH : width);

		const computeWidth = (index) => {
			return d3.sum(widths.slice(0, index + 1)) + 3 * index;
		}

		const visibleColumns = this._columns.filter((column, index) => computeWidth(index + this._pivots.length) <= NB_COLS);

		const lines = [];

		lines.push([
			...this._pivots.map((column, index) => column.padStart(widths[index])),
			...visibleColumns.map((column, index) => column.padStart(widths[index + this._pivots.length]))
		].join(' | '));
		lines.push(
			'='.repeat(computeWidth(this._pivots.length + visibleColumns.length - 1))
			+ (visibleColumns.length < this._df._columns.length ? ' ...' : '')
		);

		let previousRow;
		let isPreviousVisible;
		this._df._data.forEach((row, rowIndex) => {
			const leaves = this._pivots.reduce((acc, column) => {
				return acc[row[column]];
			}, this._tree);
			const isVisible = leaves.toArray().slice(0, MAX_LENGTH_LEAVES)
				.some(e => this._kw.isEquivalent(e, Object.keys(row).reduce((acc, key) => {
					if (this._pivots.includes(key))
						return acc;
					return {
						...acc,
						[key]: row[key]
					};
				}, {})));

			if (!isVisible && !isPreviousVisible) return;

			const line = [
				...this._pivots.map((column, index) => {
					if (!previousRow || previousRow[column] !== row[column]
						|| this._pivots.slice(0, index).filter(column => row[column] !== previousRow[column]).length > 0)
						return row[column].padStart(widths[index]);
					return '.'.padStart(widths[index]);
				})
			];
			if (isVisible) {
				line.push(...visibleColumns.map((column, index) => {
					const cell = !this._kw.isNA(row[column]) ? row[column].toString() : 'N/A';
					return cell.length > MAX_WIDTH
						? `${cell.substr(0, MAX_WIDTH - 3)}...`
						: cell.padStart(widths[index + this._pivots.length]);
				}));
			}
			else {
				line.push(`... ${leaves.length - MAX_LENGTH_LEAVES} more`);
			}
			lines.push(line.join(' | '));

			previousRow = row;
			isPreviousVisible = isVisible;
		});
		lines.push('');
		lines.push(`[${this.length} rows × ${this._columns.length} columns]`);
		lines.push(`Pivot along: ${this._pivots.join(', ')}`);
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
	* Exports the PivotTable as JSON
	* @param {string} [path=null] Path of the file to save
	* @param {Object} [options]
	* @param {boolean} [options.prettify=true] Prettify JSON output
	* @returns {string}
	*/
	toJSON(path, options = {}) {
		const prettify = options.prettify !== undefined ? options.prettify : true;

		const toArray = (acc, [key, value]) => {
			if (value instanceof require('./DataFrame.js')) {
				return {
					...acc,
					[key]: value.toArray()
				};
			}
			return {
				...acc,
				[key]: Object.entries(value).reduce(toArray, {})
			};


		}

		const content = JSON.stringify(
			Object.entries(this._tree).reduce(toArray, {}),
			null,
			prettify ? '\t' : null
		);
		if (path) fs.writeFileSync(path, content);
		return content;
	}

}

module.exports = PivotTable;
