<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

use Modules\BetterMaps\Lib\Lang;

$page = (new CHtmlPage())->setTitle(Lang::t('Maps+'));

if ($data['can_edit']) {
	$page->setControls(
		(new CTag('nav', true,
			(new CList())
				->addItem(
					(new CTextBox('bm_new_name'))
						->setId('bm-new-name')
						->setAttribute('placeholder', Lang::t('New map name'))
						->setAttribute('maxlength', 255)
						->setWidth(ZBX_TEXTAREA_STANDARD_WIDTH)
				)
				->addItem((new CSimpleButton(Lang::t('Create map')))->setId('bm-create'))
		))->setAttribute('aria-label', _('Content controls'))
	);
}

if ($data['error'] !== null) {
	$page->addItem(makeMessageBox(ZBX_STYLE_MSG_BAD, [['message' => $data['error']]], null, false));
}

$table = (new CTableInfo())->setHeader([
	Lang::t('Name'),
	Lang::t('Last modified'),
	$data['can_edit'] ? _('Actions') : null
]);

foreach ($data['maps'] as $map) {
	$view_url = (new CUrl('zabbix.php'))
		->setArgument('action', 'bettermap.view')
		->setArgument('mapid', $map['mapid']);

	$actions = null;

	if ($data['can_edit']) {
		$actions = [
			new CLink(_('Edit'), (clone $view_url)->setArgument('edit', 1)),
			NBSP(),
			(new CSimpleButton(_('Delete')))
				->addClass(ZBX_STYLE_BTN_LINK)
				->addClass('js-bm-delete')
				->setAttribute('data-mapid', $map['mapid'])
				->setAttribute('data-name', $map['name'])
		];
	}

	$table->addRow([
		new CLink($map['name'], $view_url),
		zbx_date2str(DATE_TIME_FORMAT_SECONDS, $map['updated']),
		$actions
	]);
}

$page
	->addItem(Modules\BetterMaps\Lib\Assets::tags())
	->addItem($table)
	->addItem(
		(new CScriptTag('BetterMaps.initList('.json_encode([
			'csrfName' => CSRF_TOKEN_NAME,
			'csrf' => $data['csrf_token']
		]).');'))->setOnDocumentReady()
	)
	->show();
