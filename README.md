# Better Maps : cartes réseau façon draw.io pour Zabbix 7.2

Ce module frontend ajoute **Surveillance › Cartes+**, un éditeur de cartes indépendant des cartes natives de Zabbix :

- liens **courbes**, droits ou orthogonaux, qu'on plie en les attrapant à la souris ;
- points de passage déplaçables, extrémités reconnectables d'un nœud à un autre ;
- liens parallèles (LACP, redondance) écartés automatiquement ;
- hôtes Zabbix avec icônes vectorielles, pastille de statut et halo pulsant pour les problèmes Haut et Désastre ;
- liens colorés selon la sévérité des problèmes de leurs extrémités ;
- zones (rectangles, ellipses) et textes libres ;
- annuler/rétablir, copier/coller (y compris entre deux cartes), alignement et répartition, grille magnétique ;
- mode visualisation : rafraîchissement automatique, popup des problèmes au clic, plein écran ;
- export et import JSON ;
- compatible avec les thèmes clairs et sombres de Zabbix.

Un second module optionnel ajoute le widget **Carte+**, qui affiche ces cartes dans un tableau de bord.

## Installation

1. Copier les deux dossiers dans le dossier `modules/` du frontend Zabbix :
   ```bash
   cp -r bettermaps bettermapswidget /usr/share/zabbix/modules/
   ```
   Selon le mode d'installation, ce dossier peut aussi être `/usr/share/zabbix/ui/modules/` ou `/var/www/html/zabbix/modules/`. C'est le dossier qui contient déjà `widgets/`.
2. Dans Zabbix, aller dans **Administration › Général › Modules**, cliquer sur **Analyser le répertoire**, puis activer **Better Maps** et **Carte+ (widget)**.
3. Le menu **Surveillance › Cartes+** apparaît, et le type de widget **Carte+** est proposé dans les tableaux de bord.

Le widget s'appuie sur le module principal : **Better Maps** doit rester activé.

Au premier affichage, le module crée une table `bettermaps_map` dans la base Zabbix (PostgreSQL ou MySQL). Si l'utilisateur SQL du frontend n'a pas le droit `CREATE`, créer la table à la main avec [bettermaps/sql/create_table.sql](bettermaps/sql/create_table.sql).

> La table est sauvegardée avec le reste de la base Zabbix. Elle n'est pas touchée par les mises à jour de Zabbix.

## Droits

| Action | Condition |
|---|---|
| Voir les cartes | accès à l'interface « Surveillance › Cartes » dans le rôle |
| Créer, modifier, supprimer | type Admin ou Super admin, avec l'action « Créer et modifier les cartes » |
| Statut des hôtes | via l'API Zabbix : chacun ne voit que les hôtes auxquels il a accès |

## Utilisation de l'éditeur

| Geste | Effet |
|---|---|
| Survoler un nœud, tirer depuis un point bleu vers un autre nœud | créer un lien |
| Tirer un lien | le courber (ajoute un point de passage) |
| Tirer un point plein / un point creux | déplacer / ajouter un point de passage |
| Double-clic sur un point | le supprimer |
| Tirer une extrémité d'un lien sélectionné | le reconnecter à un autre nœud |
| Glisser dans le vide (Maj pour ajouter) | sélection rectangulaire |
| Molette | zoom |
| Espace + glisser, ou clic droit + glisser | déplacer la vue |
| Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V, Ctrl+D, Suppr, flèches, Ctrl+S | raccourcis habituels |

## Widget de tableau de bord

1. Ouvrir un tableau de bord, cliquer sur **Modifier le tableau de bord**, puis **Ajouter**.
2. Choisir le type **Carte+**, sélectionner la carte, puis valider et enregistrer le tableau de bord.

![widget](docs/apercu-widget.png)

- Si le nom du widget est laissé vide, c'est le nom de la carte qui s'affiche.
- Le statut est rafraîchi selon l'intervalle du widget (30 s par défaut). Le zoom et le popup ouvert sont conservés, et les modifications de la carte sont prises en compte automatiquement.
- Le widget est en lecture seule. Un clic sur un hôte affiche ses problèmes. Les boutons de zoom apparaissent au survol, et le bouton ↗ ouvre la carte en grand.
- **Ctrl + molette** zoome. La molette seule fait défiler le tableau de bord, comme d'habitude.
- La carte se recadre quand on redimensionne le widget.

## Environnement de test

[test/docker-compose.yml](test/docker-compose.yml) lance un Zabbix 7.2 complet (PostgreSQL) avec le module monté en direct :

```bash
cd test && docker compose up -d     # http://localhost:8099  (Admin / zabbix)
```

## Structure

```
bettermaps/
├── manifest.json          déclaration du module (actions, assets)
├── Module.php             ajout de l'entrée de menu
├── actions/               contrôleurs : liste, vue, création, sauvegarde, suppression, recherche d'hôtes, statut
├── lib/                   stockage SQL, droits, base des contrôleurs JSON
├── views/                 pages liste et carte
├── assets/js/bettermap.js l'éditeur SVG (sans dépendance), aussi utilisé par le widget
├── assets/css/bettermap.css
└── sql/create_table.sql   création manuelle de la table (secours)

bettermapswidget/          widget de tableau de bord (module de type "widget")
├── manifest.json
├── Widget.php
├── includes/              formulaire du widget (choix de la carte, boutons de zoom)
├── actions/WidgetView.php renvoie la carte et le statut de ses hôtes en une requête
├── views/                 vue et formulaire du widget
└── assets/js/class.widget.js
```
