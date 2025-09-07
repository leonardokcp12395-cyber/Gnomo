const createPool = (ClassRef, initialSize = 100) => {
    const pool = [];
    for (let i = 0; i < initialSize; i++) {
        const obj = new ClassRef();
        obj.active = false;
        pool.push(obj);
    }
    return pool;
};

const getFromPool = (pool, ...args) => {
    for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
            pool[i].active = true;
            if (pool[i].init) pool[i].init(...args);
            return pool[i];
        }
    }
    const newObj = new pool[0].constructor();
    newObj.active = true;
    if (newObj.init) newObj.init(...args);
    pool.push(newObj);
    return newObj;
};

const releaseToPool = (obj) => {
    obj.active = false;
    if (obj.reset) obj.reset();
};
