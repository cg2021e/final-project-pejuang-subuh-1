/**
 * 
 * @returns {Object}
 */
export const createKeys = function () {
    const keys = {};

    document.body.addEventListener('keydown', function (event) {
        keys[event.keyCode] = true;
        keys[String.fromCharCode(event.keyCode)] = true;
    });
    document.body.addEventListener('keyup', function (event) {
        keys[event.keyCode] = false;
        keys[String.fromCharCode(event.keyCode)] = false;
    });
    document.body.addEventListener('blur', function (event) {
        // Make it so that all keys are unpressed when the browser loses focus.
        for (var key in keys) {
            if (keys.hasOwnProperty(key))
                keys[key] = false;
        }
    });

    return keys;
};

/**
 * 
 * @param {String} id 
 */
export const hideOverlay = (id) => {
    const overlay = document.getElementById(id);
    overlay.style.display = "none";
}

/**
 * 
 * @param {String} id 
 */
export const showOverlay = (id) => {
    const overlay = document.getElementById(id);
    overlay.style.display = "flex";
};

/**
 * 
 * @param {String} id 
 * @param {function} callback 
 */
export const addClick = (id, callback) => {
    document.getElementById(id).addEventListener('click', callback);
}

/**
 * 
 * @param {String} id 
 * @param {String} text 
 */
export const setText = (id, text) => {
    document.getElementById(id).innerText = text;
}

/**
 * 
 * @param {String} id 
 * @param {String} parentId 
 */
export const showOneFromParent = (id, parentId) => {
    const children = Array.from(document.getElementById(parentId).children);
    children.forEach(child => {
        if(child.id === id) {
            child.style.display = "flex";
        } else {
            child.style.display = "none";
        }
    })
}