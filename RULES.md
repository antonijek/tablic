# Tablić — pravila (verzija koju engine implementira)

Pravila koja se razlikuju od kraja do kraja označena su kao **[opcija]** i
podešavaju se u `TablicOptions`.

## Igrači i špil
- 2 igrača (1 na 1). 3 igrača i 2 na 2 dolaze kasnije.
- Špil od 52 karte, bez džokera.

## Deljenje
- Na početku partije: svakom igraču 6 karata, 4 karte licem nagore na sto.
- Kad oba igrača odigraju svih 6 karata, deli se novih 6+6 (bez karata na sto).
- Za 2 igrača partija ima 4 deljenja (4 + 4·12 = 52).
- Prvi igra igrač posle delioca; delilac se menja svake partije.

## Vrednosti karata za nošenje
| Karta | Vrednost |
|---|---|
| 2–10 | po broju |
| J (žandar) | 12 |
| Q (dama) | 13 |
| K (kralj) | 14 |
| A (kec) | 1 ili 11 |

## Potez
- Igrač odigra jednu kartu. Tom kartom može da odnese:
  - kartu iste vrednosti, i/ili
  - grupu karata čiji je zbir jednak vrednosti odigrane karte,
  - više takvih grupa odjednom, s tim da svaka karta sa stola ide u najviše jednu grupu.
- Kec na stolu i u ruci računa se kao 1 ili 11, kako igraču odgovara.
- Nošenje **nije obavezno**. Karta se uvek sme baciti na sto.
- **Tabla**: ko odnese sve karte sa stola, dobija 1 poen.
  - **[opcija `tablaOnLastMove`, podrazumevano `false`]** tabla napravljena
    poslednjom kartom partije se ne računa.

## Kraj partije
- Karte koje su ostale na stolu posle poslednje karte nosi igrač koji je poslednji nosio.

## Bodovanje partije
| Šta | Poena |
|---|---|
| svaka 10, J, Q, K, A | 1 |
| 10♦ („velika desetka“) | 2 (umesto 1) |
| 2♣ („mala dvojka“) | 1 |
| najviše karata (27+) | 3 (pri 26:26 niko) |
| svaka tabla | 1 |

U kartama ima ukupno 22 poena, plus 3 za karte, dakle 25 poena i table.

## Meč
- **[opcija `targetScore`, podrazumevano 101]** Pobeđuje ko prvi pređe cilj.
  Ako ga oba igrača pređu u istoj partiji, pobeđuje veći zbir, a pri
  izjednačenju se igra još jedna partija.
