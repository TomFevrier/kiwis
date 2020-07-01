'use strict';

class Validator {

	static string(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (typeof argument !== 'string')
			throw new Error(`Invalid argument in ${method}: '${name}' must be a string`);
		else if (options && options.enum && !options.enum.includes(argument))
			throw new Error(`Invalid value '${argument}' for ${name} in ${method}`);
		else if (options && options.not && options.not.includes(argument))
			throw new Error(`Invalid value '${argument}' for ${name} in ${method}: already used`);
	}

	static integer(method, name, argument, options) {
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

	static array(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (!Array.isArray(argument))
			throw new Error(`Invalid argument in ${method}: '${name}' must be an array`);
		else if (options.type && argument.some(e => typeof e !== options.type))
			throw new Error(`Invalid argument in ${method}: '${name}' must be only contain ${options.type}s`);
		else if (options.enum) {
			const invalidValue = argument.find(e => !options.enum.includes(e));
			if (invalidValue !== undefined)
				throw new Error(`Invalid value '${invalidValue}' in argument '${name}' of ${method}`);
		}
	}

	static object(method, name, argument, options) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (typeof argument !== 'object' || !argument)
			throw new Error(`Invalid argument in ${method}: '${name}' must be an object`);
	}

	static instanceOf(method, name, argument, className, classType) {
		if (argument === undefined)
			throw new Error(`Missing argument in ${method}: '${name}' is required`);
		else if (!(typeof argument === 'object') || !(argument instanceof classType))
			throw new Error(`Invalid argument in ${method}: '${name}' must be of type '${className}'`);
	}

	static options(method, options, expected) {
		for (let [key, value] of Object.entries(options)) {
			if (value === undefined) continue;
			const option = expected.find(option => option.key === key);
			if (option === undefined)
				throw new Error(`Unknown option '${key}' in ${method}`);
			if (!option.type) continue;
			const types = option.type.split('|');
			const isCorrectType = types.some(type => typeof value === type ||
				(type.includes('[]') && Array.isArray(value)
				&& value.every(e => typeof e === type.split('[]')[0] || type.split('[]')[0] === '*')));
			if (!isCorrectType)
				throw new Error(`Invalid option in ${method}: '${key}' must be of type ${types.join(' or ')}`);
			if (option.enum && Array.isArray(value)) {
				const invalidValue = value.find(e => !option.enum.includes(e));
				if (invalidValue !== undefined)
					throw new Error(`Invalid value '${invalidValue}' for option '${key}' in ${method}`);
			}
			else if (option.enum && !option.enum.includes(value)) {
				throw new Error(`Invalid value '${value}' for option '${key}' in ${method}`);
			}

		}
	}

}

module.exports = Validator;
