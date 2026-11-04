<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$map = $data['map'];

$config = [
	'mapid' => $map['mapid'],
	'name' => $map['name'],
	'data' => $map['data'] ?: new stdClass(),
	'canEdit' => $data['can_edit'],
	'edit' => $data['edit'],
	'csrfName' => CSRF_TOKEN_NAME,
	'csrf' => $data['csrf_token']
];

(new CHtmlPage())
	->setTitle($map['name'])
	->setNavigation(
		(new CList())->addItem(
			new CLink('← Toutes les cartes', (new CUrl('zabbix.php'))->setArgument('action', 'bettermap.list'))
		)
	)
	->addItem(Modules\BetterMaps\Lib\Assets::tags())
	->addItem((new CDiv())->setId('bm-map'))
	->addItem(
		(new CScriptTag(
			'BetterMaps.initMap(document.getElementById("bm-map"), '.
				json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT).');'
		))->setOnDocumentReady()
	)
	->show();
