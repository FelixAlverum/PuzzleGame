// Spiele der Bibliothek. Ein neues Spiel: Ordner unter games/, Manifest mit defineGame, hier eintragen.
// Importiert werden nur die Manifeste – der Spielcode lädt erst beim Start (dynamischer import im Manifest).
import cozyGarden from '@spielesammlung/cozy-garden';
import minesweeper from '@spielesammlung/minesweeper';
import solitaire from '@spielesammlung/solitaire';
import spider from '@spielesammlung/spider';

export const GAMES = [cozyGarden, minesweeper, solitaire, spider];

export const findGame = id => GAMES.find(g => g.id === id) || null;

// Geplante Spiele: erscheinen in der Bibliothek als „Bald verfügbar“ ({ id, title: { de, en, … }, icon: '<svg …>' })
export const UPCOMING = [];
