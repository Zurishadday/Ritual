// Genera las imágenes de ejemplo (SVG) en public/img. Reemplázalas por tus fotos reales con el mismo nombre
// (o cambia las rutas en public/index.html).
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('public/img', { recursive: true });

const marco = (w, h, c1, c2, figura) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${figura}<text x="${w / 2}" y="${h - 18}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(h / 24)}" fill="#ffffff" fill-opacity=".8">Foto de ejemplo</text></svg>`;

const persona = (x, y, s, c) => `<g fill="${c}" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-90" r="28"/><rect x="-30" y="-55" width="60" height="110" rx="26"/><rect x="-28" y="50" width="24" height="90" rx="10"/><rect x="4" y="50" width="24" height="90" rx="10"/></g>`;

const imagenes = {
  portada: marco(1200, 700, '#2f8f78', '#14503f', persona(420, 330, 2.2, '#ffffff55') + persona(760, 350, 2.4, '#ffffff88') + '<circle cx="1000" cy="150" r="90" fill="#ffffff22"/>'),
  rodilla: marco(600, 400, '#3a7ca5', '#16425b', persona(300, 190, 1.3, '#ffffff88') + '<circle cx="300" cy="290" r="22" fill="#f2a900"/>'),
  espalda: marco(600, 400, '#6a994e', '#2d4a22', '<rect x="120" y="250" width="360" height="40" rx="20" fill="#ffffff66"/><rect x="150" y="205" width="300" height="50" rx="25" fill="#ffffffaa"/><circle cx="470" cy="215" r="28" fill="#ffffffaa"/>'),
  masaje: marco(600, 400, '#d97b29', '#8a3b12', '<rect x="90" y="250" width="420" height="46" rx="12" fill="#ffffff55"/><rect x="130" y="205" width="340" height="46" rx="23" fill="#ffffffaa"/><ellipse cx="250" cy="170" rx="60" ry="26" fill="#ffffff88"/>'),
};
for (const [nombre, svg] of Object.entries(imagenes)) writeFileSync(`public/img/${nombre}.svg`, svg);
console.log('Imágenes creadas:', Object.keys(imagenes).join(', '));
