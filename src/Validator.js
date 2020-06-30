'use strict';

class Validator {

	static string(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (typeof argument !== 'string')
			throw new Error(`Invalid argument in ${method}: '${name}' must be a string`);
		else if (options && options.enum && !options.enum.includes(argument))
			throw new Error(`Invalid value ${argument} for ${name}`);
	}

	static int(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (typeof argument !== 'number' || argument % 1 !== 0)
			throw new Error(`Invalid argument in ${method}: '${name}' must be an integer`);
		else if (options && options.range && (argument < options.range[0] || argument > options.range[1]))
			throw new Error(`Value [${argument}] out of range for '${name}' in ${method}`);
	}

	static function(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (typeof argument !== 'function')
			throw new Error(`Invalid argument in ${method}: '${name}' must be a function`);
	}

	static options(method, options, expected) {
		for (let [key, value] of Object.entries(options)) {
			const option = expected.find(option => option.key === key);
			if (option === undefined)
				throw new Error(`Invalid option '${key}' in ${method}`);
		}
	}

}

module.exports = Validator;
