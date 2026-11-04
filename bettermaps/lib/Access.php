<?php declare(strict_types = 0);

namespace Modules\BetterMaps\Lib;

use CCsrfTokenHelper;
use CRoleHelper;
use CWebUser;

class Access {

	public const CSRF_ACTION = 'bettermap';

	/**
	 * Lecture : même droit que la page native Surveillance > Cartes.
	 */
	public static function canView(): bool {
		return CWebUser::checkAccess(CRoleHelper::UI_MONITORING_MAPS);
	}

	/**
	 * Édition : administrateurs Zabbix ayant le droit "Créer et modifier les cartes".
	 */
	public static function canEdit(): bool {
		return self::canView()
			&& CWebUser::getType() >= USER_TYPE_ZABBIX_ADMIN
			&& CWebUser::checkAccess(CRoleHelper::ACTIONS_EDIT_MAPS);
	}

	public static function csrfToken(): string {
		return CCsrfTokenHelper::get(self::CSRF_ACTION);
	}

	public static function checkCsrf(?string $token): bool {
		return is_string($token) && CCsrfTokenHelper::check($token, self::CSRF_ACTION);
	}
}
