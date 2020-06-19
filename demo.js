import kw from './src/Kiwis.js';

// Create a DataFrame from an array of objects
const h2g2Characters = kw.DataFrame([
	{
		name: 'Marvin',
		surname: '',
		occupation: 'Paranoid Android'
	},
	{
		name: 'Zaphod',
		surname: 'Beeblebrox',
		occupation: 'President of the Galaxy'
	},
	{
		name: 'Arthur',
		surname: 'Dent',
		occupation: null
	}
]);

// Load a CSV file into a DataFrame
const data = kw.loadCSV('sentiment_differences.csv');

// Display DataFrames
h2g2Characters.show();
data.show(); // Large cells and DataFrames get truncated

// Access rows
console.log(h2g2Characters[0], h2g2Characters[2]);
console.log();

// Show columns as Series
data['link'].show();
data.title.show();

// Convert a DataFrame to an array of Objects
console.log(h2g2Characters.toArray());
console.log();

// Display a slice of a DataFrame
data.slice(10, 24).show();

// Iterate over the rows and indexes of a DataFrame
for (let [index, row] of h2g2Characters.items()) {
	console.log(`${index + 1}.`);
	console.log(`Name: ${row.name} ${row.surname}`);
	console.log(`Occupation: ${row.occupation || 'N/A'}`);
	console.log();
}

// Drop N/A values
h2g2Characters.dropNA().show();
h2g2Characters.dropNA({ keep: [''], axis: 'columns' }).show();

// Append new rows to a DataFrame
h2g2Characters.append([
	{
		name: 'Ford',
		surname: 'Prefect',
		occupation: 'Writer for the Hitchhiker\'s Guide to the Galaxy'
	},
	{
		name: 'Trillian',
		surname: '',
		species: 'human'
	}
], { extend: true, inPlace: true }).show();

// Insert a new row to a DataFrame
h2g2Characters.insert({
	name: 'Slartibartfast',
	surname: '',
	occupation: 'Planet designer'
}, 2, { extend: true, inPlace: true }).show();


// Rename and reorder columns
h2g2Characters
	.rename({ surname: 'familyName', occupation: 'job' })
	.reorder(['familyName', 'name', 'species', 'job'])
	.show();


// Add a new column to a DataFrame by applying a function to it, and save it as CSV
h2g2Characters.addColumn('fullName', h2g2Characters.map(e => `${e.name} ${e.surname}`), { inPlace: true });
h2g2Characters.show();
h2g2Characters.saveCSV('h2g2Characters.csv');

// Sort articles by date and by score, and only show a selection of columns
data.sort(['date', 'score']).filter(['title', 'date', 'score']).show();

// Filter articles published on 4/8/2020 and calculate their mean score after rounding them to 2 digits
console.log(data.filter(e => e.date == '2020-04-08').score.round(2).mean());
