# Tablić — pravila (verzija koju engine implementira)

Izvori i varijante: [docs/PRAVILA_IZVORI.md](docs/PRAVILA_IZVORI.md). Pravila koja se razlikuju
od kraja do kraja označena su kao **[opcija]** i podešavaju se u `TablicOptions`.

## Igrači i špil
- 2 igrača, 3 igrača (svako za sebe) ili 4 igrača (2 na 2). **[opcija `players`, podrazumevano 2]**
- U četvoro su parovi mesta 0+2 i 1+3 (partneri sede jedan preko puta drugog).
- Špil od 52 karte, bez džokera.

## Deljenje
- Prvi delilac se izvlači nasumično. **[opcija `firstDealer`]**
- Na početku partije: svakom igraču 6 karata, 4 karte licem nagore na sto.
- Deljenje i igra idu suprotno od kazaljke na satu. Mesta su numerisana po redu igranja,
  pa je „sledeći“ uvek mesto + 1. Prvi igra igrač posle delioca (sa njegove desne strane).
- Kad svi odigraju sve karte, deli se ponovo (bez karata na sto): po 6, a kad za to nema
  dovoljno karata, ostatak na jednake delove.
  - u dvoje: 4 deljenja (4 + 4·12 = 52)
  - u troje: 3 deljenja, poslednje po 4 karte (4 + 18 + 18 + 12 = 52)
  - u četvoro: 2 deljenja (4 + 24 + 24 = 52)
- Posle svake partije deli sledeći igrač.
- Sečenje i „donja karta delioca“ (pagat) nisu modelovani — mešanje je ionako nasumično.

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
- Nošenje **nije obavezno**. Karta se uvek sme baciti na sto. Odigrana karta se ne vraća.
- Nošene karte su u igri licem nadole: UI ih ne prikazuje do kraja partije.
  (`PlayerView` ih i dalje sadrži, jer je svako video poteze — AI ih „pamti“.)
- **Tabla**: ko odnese sve karte sa stola, dobija 1 poen. Ne računa se:
  - poslednjom kartom partije **[opcija `tablaOnLastMove`, podrazumevano `false`]**,
  - strani koja već ima `targetScore − 1` (100) poena — poslednji poen se ne dobija tablom.

## Kraj partije
- Karte koje su ostale na stolu posle poslednje karte nosi igrač koji je poslednji nosio (bez table).

## Bodovanje partije (po strani: igrač, a u četvoro par)
| Šta | Poena |
|---|---|
| svaka 10, J, Q, K, A | 1 |
| 10♦ („velika desetka“) | 2 (umesto 1) |
| 2♣ („mala dvojka“) | 1 |
| najviše karata | 3 (ako više strana ima isto najviše — niko) |
| svaka tabla | 1 |

U kartama ima ukupno 22 poena, plus 3 za karte, dakle 25 poena i table.

## Meč
- **[opcija `targetScore`, podrazumevano 101]** Pobeđuje ko dostigne cilj (101 ili više).
  Partija se uvek igra do kraja. Ako cilj dostigne više strana u istoj partiji, pobeđuje
  veći zbir, a pri izjednačenju na vrhu se igra još jedna partija.
