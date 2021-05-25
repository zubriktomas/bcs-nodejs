V tomto súbore je uvedených 9 stránok, na ktorých bol testovaný 
proces zhlukovania a predovšetkým rôznej funkcionality medzi
základnou a rozšírenou implementáciou, pričom rozšírená umožňuje
zlúčiť zhluky, ktoré prekrývajú iný zhluk v prípade, ak je daný 
zhluk vizuálne obsiahnutý v novom kandidátnom zhluku, ktorý by 
sa mal vytvoriť.

V prípade, ak chceme otestovať aplikáciu na týchto jednoduchých 
pripravených stránkach odporúčam použiť príkaz `http-server .`,
ktorý predstavuje rýchly, jednoduchý spôsob ako pomocou Node.js
spustiť HTTP server na localhoste (predvolene na porte 8080).

Inštalácia:
sudo npm install http-server -g

Použitie v adresári:
http-server .

Poznámka:
Všetky stránky v adresári sú následne dostupné na URL: 
http://localhost:8080/ prostredníctvom prehliadača. 
Rovnako je výhodné použiť http-server na vizualizáciu 
JSON a XML dokumentov pri použití vhodného rozšírenia v prehliadači.