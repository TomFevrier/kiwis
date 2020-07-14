'use strict';

const d3 = require('d3-dsv');

const DataFrame = require('./DataFrame.js');
const Series = require('./Series.js');

const Validator = require('./Validator.js');


/**
 * @namespace
 */
class Kiwis {

	/**
	* Returns a new DataFrame from the given data
	* @param {Object[]} data An array of objects
	* @returns {DataFrame}
	* @example
	* const kw = require('kiwis');
	*
	* const df = kw.DataFrame([
  	*   {
    *     name: 'Marvin',
    *     surname: '',
    *     occupation: 'Paranoid Android'
  	*   },
  	*   {
    *     name: 'Zaphod',
    *     surname: 'Beeblebrox',
    *     occupation: 'President of the Galaxy'
  	*   },
  	*   {
    *     name: 'Arthur',
    *     surname: 'Dent',
    *     occupation: null
  	*   }
	* ]);
	*
	* console.log(df.length) // 3
	* console.log(df.columns) // ['name', 'surname', 'occupation']
	* console.log(df.empty) // false
	*/
	static DataFrame(data) {
		Validator.array('Kiwis.DataFrame()', 'data', data, { type: 'object' });
		return new DataFrame(data);
	}

	/**
	* Returns a new Series from the given data
	* @param {*[]} data An array of values
	* @returns {Series}
	* @example
	* const kw = require('kiwis');
	*
	* const series = kw.Series([1, 1, 2, 3, 5, 8, 13, 21, 34]);
	*
	* console.log(series.length) // 9
	* console.log(series.empty) // false
	*/
	static Series(data) {
		Validator.array('Kiwis.Series()', 'data', data);
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
	* @example
	* const kw = require('kiwis');
	*
	* // Loads a CSV file
	* const df = kw.loadCSV('myAwesomeData.csv');
	*
	* // Loads a TSV file and prettify the columns in camelCase
	* const df = kw.loadCSV('myAwesomeData.tsv', { delimiter: '\t', prettify; 'camelCase' });
	*/
	static loadCSV(path, options = {}) {
		Validator.string('Kiwis.loadCSV()', 'path', path);
		Validator.options('Kiwis.loadCSV()', options, [
			{ key: 'encoding', type: 'string' },
		]);

		const encoding = options.encoding || 'utf8';

		const rawData = eval('require')('fs').readFileSync(path, { encoding });

		return this.parseCSV(rawData, options);
	}

	/**
	* Parses a CSV string into a DataFrame
	* @param {string} csv CSV string to parse
	* @param {Object} [options] Options
	* @param {string} [options.delimiter=','] Delimiter of the file
	* @param {('none'|'camelCase'|'snake_case')} [options.prettify='none'] Prettify column names
	* @returns {DataFrame}
	* @example
	* const kw = require('kiwis');
	*
	* // Parses a CSV string
	* const df = kw.parseCSV(`
	*   name,surname,occupation\n
    *   Marvin,,Paranoid Android\n
	*   Zaphod,Beeblebrox,President of the Galaxy\n
  	*   Arthur,Dent,\n
	* `);
	*/
	static parseCSV(csv, options = {}) {
		Validator.string('Kiwis.parseCSV()', 'csv', csv);
		Validator.options('Kiwis.parseCSV()', options, [
			{ key: 'delimiter', type: 'string' },
			{ key: 'prettify', type: 'string', enum: ['none', 'camelCase', 'snake_case'] }
		]);

		const delimiter = options.delimiter || ',';
		const prettify = options.prettify || 'none';

		const parser = d3.dsvFormat(delimiter);
		const data = parser.parse(csv);

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
	* @example
	* Kiwis.isNA('kiwi'); // false
	* Kiwis.isNA(''); // true
	* Kiwis.isNA('', { keep: [0, false, ''] }); // false
	*/
	static isNA(value, options = {}) {
		Validator.options('Kiwis.isNA()', options, [
			{ key: 'keep', type: '*[]' },
		]);

		const keep = options.keep || [0, false];

		return !value && !keep.includes(value);
	}

	static isEquivalent(obj1, obj2) {
		if (obj1 == obj2) return true;
		if (!obj1 || !obj2) return false;
		return Object.entries(obj1).reduce((acc, [key, value]) => {
			return acc && key in obj2 && value === obj2[key];
		}, true);
	}
}

module.exports = Kiwis;
