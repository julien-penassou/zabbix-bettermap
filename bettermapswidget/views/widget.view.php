<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$view = new CWidgetView($data);

if ($data['error'] !== null) {
	$view->addItem((new CTableInfo())->setNoDataMessage($data['error']));
}
else {
	$view
		->addItem((new CDiv())->addClass('bm-widget'))
		->setVar('bettermap', $data['bettermap']);
}

$view->show();
