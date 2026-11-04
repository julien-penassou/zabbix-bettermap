<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

(new CWidgetFormView($data))
	->addField(new CWidgetFieldSelectView($data['fields']['mapid']))
	->addField(new CWidgetFieldCheckBoxView($data['fields']['show_controls']))
	->show();
