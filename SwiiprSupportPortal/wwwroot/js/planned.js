import { tasks } from './tasks.js';

const id = new URLSearchParams(location.search).get('id');
const t = tasks.find((x) => x.id === id && x.status === 'planned');
const $ = (i) => document.getElementById(i);
const list = (el, items) => el.replaceChildren(...items.map((x) => Object.assign(document.createElement('li'), { textContent: x })));

if (t) {
  document.title = `${t.title} (planned) - Swiipr Support Portal`;
  $('title').textContent = t.title;
  $('purpose').textContent = t.purpose;
  list($('inputs'), t.inputs);
  list($('outputs'), t.outputs);
} else {
  $('title').textContent = 'Unknown task';
  $('purpose').textContent = 'This task is not in the catalogue.';
}
