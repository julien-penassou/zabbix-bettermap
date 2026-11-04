/*
 * Widget « Carte+ » : affiche une carte Better Maps dans un tableau de bord.
 * L'éditeur (window.BetterMaps) est fourni par le module principal « Better Maps ».
 */
class CWidgetBetterMap extends CWidget {

	onInitialize() {
		this._editor = null;
		this._map_key = null;
	}

	hasPadding() {
		return false;
	}

	setContents(response) {
		const map = response.bettermap;

		if (!map || !window.BetterMaps) {
			this._destroyEditor();
			super.setContents(response);

			if (map && !window.BetterMaps) {
				this._body.textContent = 'Le module « Better Maps » doit être activé.';
			}

			return;
		}

		// Même carte, même version : on garde l'affichage (zoom, popup) et on ne met à jour que le statut.
		const key = map.mapid + ':' + map.updated + ':' + map.controls;

		if (this._editor !== null && this._map_key === key) {
			this._editor.setStatus(map.status);

			return;
		}

		this._destroyEditor();
		super.setContents(response);

		this._editor = BetterMaps.initMap(this._body.querySelector('.bm-widget'), {
			...map,
			embedded: true,
			canEdit: false,
			edit: false
		});
		this._map_key = key;
	}

	onResize() {
		if (this._editor !== null) {
			this._editor.fit();
		}
	}

	onClearContents() {
		this._destroyEditor();
	}

	onDestroy() {
		this._destroyEditor();
	}

	_destroyEditor() {
		if (this._editor !== null) {
			this._editor.destroy();
			this._editor = null;
			this._map_key = null;
		}
	}
}
