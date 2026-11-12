<?php declare(strict_types = 0);

/*
 * Better Maps — French translation of the server-side messages (pages, widget, errors).
 * The editor itself is translated in assets/js/lang.fr.js.
 */
return [
	// Menu, pages, widget
	'Maps+' => 'Cartes+',
	'Map+' => 'Carte+',
	'{name} - Maps+' => '{name} - Cartes+',
	'New map name' => 'Nom de la nouvelle carte',
	'Create map' => 'Créer une carte',
	'Name' => 'Nom',
	'Last modified' => 'Dernière modification',
	'← All maps' => '← Toutes les cartes',
	'Map' => 'Carte',
	'Zoom buttons' => 'Boutons de zoom',
	'You do not have access to maps.' => 'Vous n\'avez pas accès aux cartes.',
	'Map not found: choose a map in the widget configuration.' =>
		'Carte introuvable : choisissez une carte dans la configuration du widget.',

	// Erreurs
	'Invalid request or session expired.' => 'Requête invalide ou session expirée.',
	'Deletion failed.' => 'Échec de la suppression.',
	'Saving failed.' => 'Échec de l\'enregistrement.',
	'Map too large.' => 'Carte trop volumineuse.',
	'Invalid map data.' => 'Données de carte invalides.',
	'This map no longer exists.' => 'Cette carte n\'existe plus.',
	'Unreadable file.' => 'Fichier illisible.',
	'Icon not found.' => 'Icône introuvable.',
	'Unable to create table {table}. Create it manually with the script in the module\'s sql/ folder.' =>
		'Impossible de créer la table {table}. Créez-la manuellement avec le script sql/ fourni avec le module.',
	'Empty or too large file (1 MB max).' => 'Fichier vide ou trop volumineux (1 Mo au maximum).',
	'Saving the icon failed.' => 'Échec de l\'enregistrement de l\'icône.',
	'Unrecognized format: only SVG, PNG, JPEG, GIF and WebP files are accepted.' =>
		'Format non reconnu : seuls les fichiers SVG, PNG, JPEG, GIF et WebP sont acceptés.',
	'SVG rejected: DOCTYPE / ENTITY declarations are not allowed.' =>
		'SVG refusé : les déclarations DOCTYPE / ENTITY ne sont pas autorisées.',
	'SVG rejected: it contains a <{element}> element.' => 'SVG refusé : il contient un élément <{element}>.',
	'SVG rejected: it contains an event handler ({attribute}).' =>
		'SVG refusé : il contient un gestionnaire d\'évènement ({attribute}).',
	'SVG rejected: it references an external resource.' => 'SVG refusé : il fait référence à une ressource externe.',
	'SVG rejected: its stylesheet references an external resource.' =>
		'SVG refusé : sa feuille de style fait référence à une ressource externe.'
];
