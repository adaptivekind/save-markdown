import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

let firstWord: string;
let secondWord: string;

Given('I have the word {string}', async function (word: string) {
  firstWord = word;
});

When('I compare it to {string}', async function (word: string) {
  secondWord = word;
});

Then('they should be equal', async function () {
  assert.equal(firstWord, secondWord);
});
