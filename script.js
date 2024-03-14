'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sortHeader = document.querySelector('.workouts__sort__header');
const formCloseBtn = document.querySelector('.form__close a');
const fitMapToWorkouts = document.querySelector('.fit__workouts');
const deleteAll = document.querySelector('.workouts__delete_all');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / this.duration / 60;
        return this.speed;
    }
}

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorage();
        form.addEventListener('submit', this._newWorkOut.bind(this));
        formCloseBtn.addEventListener('click', this._hideForm);
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._workoutClicked.bind(this));
        sortHeader.addEventListener('click', this._sortWorkouts.bind(this));
        fitMapToWorkouts.addEventListener('click', this._fitMapToWorkouts.bind(this));
        deleteAll.addEventListener('click', this._deleteAll.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function () {
                    alert('Cannot access location')
                }, {enableHighAccuracy: true, maximumAge: 10000});
        }
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout, true);
        });
    }

    _showForm(mapE) {
        this._hideForm();
        form.dataset.workout = "none";
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        setTimeout(() => inputDistance.focus(), 200);
    }

    _hideForm() {
        inputType.disabled = '';
        inputDistance.value = inputElevation.value = inputCadence.value = inputDuration.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 200);
    }

    _toggleElevationField() {
        if (inputType.value === 'running') {
            inputElevation.closest('.form__row').classList.add('hidden');
            inputCadence.closest('.form__row').classList.remove('hidden');
        } else {
            inputElevation.closest('.form__row').classList.remove('hidden');
            inputCadence.closest('.form__row').classList.add('hidden');
        }
    }

    _newWorkOut(evt) {
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        evt.preventDefault();

        let workout;
        const newRecord = form.dataset.workout === "none";
        if (!newRecord) {
            workout = this.#workouts.find(w => w.id === form.dataset.workout);
        }
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have be positive numbers');
            }
            if (newRecord) {
                const {lat, lng} = this.#mapEvent.latlng;
                workout = new Running([lat, lng], distance, duration, cadence);
            } else {
                workout.distance = distance;
                workout.duration = duration;
                workout.cadence = cadence;
                Running.prototype.calcPace.call(workout);
            }
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have be positive numbers');
            }
            if (newRecord) {
                const {lat, lng} = this.#mapEvent.latlng;
                workout = new Cycling([lat, lng], distance, duration, elevation);
            } else {
                workout.distance = distance;
                workout.duration = duration;
                workout.elevationGain = elevation;
                Cycling.prototype.calcSpeed.call(workout);
            }
        }

        if (newRecord) {
            this.#workouts.push(workout);
            sortHeader.classList.remove('hidden');
            deleteAll.classList.remove('hidden');
        }

        this._renderWorkoutMarker(workout, newRecord);
        this._renderWorkout(workout, newRecord);

        this._hideForm();

        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout, newRecord) {
        if (newRecord) {
            const marker = L.marker(workout.coords, {
                id: workout.id,
                icon: L.divIcon({html: workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ ', iconSize: 20, className: 'workout-icon' })
            });
            marker.addTo(this.#map)
                .bindPopup(L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                }))
                .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '} ${workout.description}`)
                .openPopup();
        }
    }

    _renderWorkout(workout, newRecord) {
        if (!newRecord) {
            const workoutEl = document.querySelector(`.workout[data-id="${workout.id}"]`);

            workoutEl.classList.add('animate');
            setTimeout(() => workoutEl.remove(), 200);
        }
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__edit">
              <span class="tooltip">Edit Workout</span>&#9998;
          </div>
          <div class="workout__delete">
              <span class="tooltip">Delete Workout</span>X
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running') {
            html += `
              <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
              </div>
            </li>`
        }

        if (workout.type === 'cycling') {
            html += `
              <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">spm</span>
              </div>
            </li>`
        }

        containerWorkouts.insertAdjacentHTML('afterbegin', html);
    }

    _workoutClicked(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;

        const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

        if (e.target.classList.contains('workout__delete')) {
            const deleteOK = confirm('Are you sure you want to delete?');
            if (deleteOK) {
                this._deleteWorkout(workoutEl, workout);
            }
        } else if (e.target.classList.contains('workout__edit')) {
            this._editWorkout(workoutEl, workout);
        } else{
            this.#map.setView(workout.coords, this.#mapZoomLevel, {
                animate: true,
                pan: {
                    duration: 1
                }
            });
        }
    }

    _sortWorkouts(e) {
        if (e.target instanceof HTMLAnchorElement) {
            const sortLink = e.target;
            const sortMetadata = sortLink.dataset.sort;
            if (!sortMetadata) return;
            const [sortParam, sortDirection] = sortMetadata.split('-');
            const sortFactor = sortDirection === 'ascending' ? 1 : -1;

            this.#workouts.sort((w1, w2) => {
                return w1[sortParam] >= w2[sortParam] ? -sortFactor : sortFactor;
            })

            containerWorkouts.querySelectorAll('.workout').forEach(w => w.remove());
            this.#workouts.forEach(workout => {
                this._renderWorkout(workout,true);
            });

            sortHeader.querySelectorAll('div').forEach(link => {
                link.classList.remove('active__sort');
            });

            sortLink.closest('div').querySelectorAll('a').forEach(link => {
                link.classList.toggle('hidden');
                if (!link.classList.contains('hidden')) {
                    link.parentElement.classList.add('active__sort');
                }
            });


        }
    }

    _deleteWorkout(workoutEl, workout) {
        this.#workouts = this.#workouts.filter(w => w.id !== workout.id);
        if (this.#workouts.length === 0) {
            sortHeader.classList.add('hidden');
            deleteAll.classList.add('hidden');
        }
        this._setLocalStorage();

        workoutEl.classList.add('animate');
        setTimeout(() => workoutEl.remove(), 200);

        let marker;
        this.#map.eachLayer(l => {
            if (l.options.id === workout.id) {
                marker = l;
            }
        })
        this.#map.removeLayer(marker);
        this._hideForm();
    }

    _deleteAll() {
        const answer = confirm('Are you sure you want to delete all workouts? This is irreversible!');
        if (answer) {
            this.#workouts.forEach(workout => {
                this.#map.eachLayer(l => {
                    if (l.options.id === workout.id) {
                        this.#map.removeLayer(l);
                    }
                })
            })
            this.#workouts.splice(0);
            this._setLocalStorage();
            containerWorkouts.querySelectorAll('.workout').forEach(w => w.remove());
            sortHeader.classList.add('hidden');
            deleteAll.classList.add('hidden');
            this._hideForm();
        }
    }

    _editWorkout(workoutEl, workout) {
        inputType.value = workout.type;
        this._toggleElevationField(inputType);
        inputType.disabled = 'disabled';
        inputDistance.value = workout.distance;
        inputDuration.value = workout.duration;
        inputCadence.value = workout.cadence;
        inputElevation.value = workout.elevationGain;

        form.classList.remove('hidden');
        form.dataset.workout = `${workout.id}`;
        inputDistance.focus();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;
        this.#workouts = data;

        if (this.#workouts.length > 0) {
            sortHeader.classList.remove('hidden');
            deleteAll.classList.remove('hidden');
        }

        this.#workouts.forEach(workout => {
            this._renderWorkout(workout, true);
        });
    }

    _fitMapToWorkouts() {
        let latMin = Number.MAX_VALUE, latMax = Number.MIN_VALUE, lngMin = Number.MAX_VALUE, lngMax = Number.MIN_VALUE;
        this.#workouts.forEach(w => {
            latMin = Math.min(latMin, w.coords[0]);
            latMax = Math.max(latMax, w.coords[0]);
            lngMin = Math.min(lngMin, w.coords[1]);
            lngMax = Math.max(lngMax, w.coords[1]);
        });
        const margin = 5e-3;
        const corner1 = L.latLng(latMin - margin, lngMax + margin);
        const corner2 = L.latLng(latMax + margin, lngMin - margin);
        const bounds = L.latLngBounds(corner1, corner2);
        this.#map.fitBounds(bounds);
    }
}

const app = new App();

