import fs from 'fs';
import d3 from 'd3-dsv';

import DataFrame from './DataFrame.js';
import Series from './Series.js';


/**
 * @namespace
 */
class Kiwis {

	/**
	* Returns a new DataFrame from the given data
	* @param {Object[]} data An array of objects
	* @returns {DataFrame}
	*/
	static DataFrame(data) {
		return new DataFrame(data);
	}

	/**
	* Returns a new Series from the given data
	* @param {*[]} data An array of values
	* @returns {Series}
	*/
	static Series(data) {
		return new Series(data);
	}

	/**
	* Loads a CSV file into a DataFrame
	* @param {string} path Path of the file to load
	* @param {Object} [options] Options
	* @param {string} [options.delimiter=','] Delimiter of the file
	* @param {string} [options.encoding='utf8'] Encoding of the file
	* @param {('none'|'camelCase'|'snake_case')} [options.prettify='none'] Prettify column names
	* @returns {DataFrame}
	*/
	static loadCSV(path, options = {}) {
		const delimiter = options.delimiter || ',';
		const encoding = options.encoding || 'utf8';
		const prettify = options.prettify || 'none';
		const parser = d3.dsvFormat(delimiter);

		const rawData = fs.readFileSync(path, { encoding });
		const data = parser.parse(rawData);

		const df = new DataFrame(data);
		switch (prettify) {
			case 'camelCase':
				df.columns = df.columns.map(column => {
					return column.toLowerCase()
						.split(' ').map((word, index) => index > 0 ? word[0].toUpperCase() + word.slice(1) : word)
						.join('');
				});
				break;
			case 'snake_case':
				df.columns = df.columns.map(column => column.toLowerCase().replace(/ /g, '_'));
				break;
		}
		return df;
	}

	/**
	* Determines whether a value is N/A or not
	* @param {*} value
	* @param {Object} [options] Options
	* @param {*[]} [options.keep=[0, false]] Array of falsy values not considered N/A
	* @returns {boolean}
	*/
	static isNA(value, options = {}) {
		const keep = options.keep || [0, false];
		return !value && !keep.includes(value);
	}
}

export default Kiwis;
