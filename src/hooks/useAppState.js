import { useReducer, useCallback } from 'react';

// Initial State
const initialState = {
    appState: 'idle',
    isRunning: false,
    services: null,
    modelStatus: {
        cv: 'idle',
        cvProgress: 0,
        cvMessage: '',
        ai: 'idle',
        aiProgress: 0,
        aiMessage: '',
    },
    detectionResult: null,
    funFactData: null,
    error: null,
    copyStatus: 'idle',
};

// Action Types
const ACTION = {
    SET_APP_STATE: 'SET_APP_STATE',
    SET_IS_RUNNING: 'SET_IS_RUNNING',
    SET_SERVICES: 'SET_SERVICES',
    SET_MODEL_STATUS: 'SET_MODEL_STATUS',
    SET_DETECTION_RESULT: 'SET_DETECTION_RESULT',
    SET_FUN_FACT_DATA: 'SET_FUN_FACT_DATA',
    SET_ERROR: 'SET_ERROR',
    SET_COPY_STATUS: 'SET_COPY_STATUS',
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
    case ACTION.SET_APP_STATE:
        return { ...state, appState: action.payload };

    case ACTION.SET_IS_RUNNING:
        return { ...state, isRunning: action.payload };

    case ACTION.SET_SERVICES:
        return { ...state, services: action.payload };

    case ACTION.SET_MODEL_STATUS:
        if (typeof action.payload === 'function') {
            return { ...state, modelStatus: action.payload(state.modelStatus) };
        }
        return { ...state, modelStatus: { ...state.modelStatus, ...action.payload } };

    case ACTION.SET_DETECTION_RESULT:
        return { ...state, detectionResult: action.payload };

    case ACTION.SET_FUN_FACT_DATA:
        return { ...state, funFactData: action.payload };

    case ACTION.SET_ERROR:
        return { ...state, error: action.payload };

    case ACTION.SET_COPY_STATUS:
        return { ...state, copyStatus: action.payload };

    default:
        return state;
    }
}

// Hook
export function useAppState() {
    const [state, dispatch] = useReducer(appReducer, initialState);

    const actions = {
        setAppState: useCallback(
            (value) => dispatch({ type: ACTION.SET_APP_STATE, payload: value }),
            []
        ),
        setIsRunning: useCallback(
            (value) => dispatch({ type: ACTION.SET_IS_RUNNING, payload: value }),
            []
        ),
        setServices: useCallback(
            (value) => dispatch({ type: ACTION.SET_SERVICES, payload: value }),
            []
        ),
        setModelStatus: useCallback(
            (value) => dispatch({ type: ACTION.SET_MODEL_STATUS, payload: value }),
            []
        ),
        setDetectionResult: useCallback(
            (value) => dispatch({ type: ACTION.SET_DETECTION_RESULT, payload: value }),
            []
        ),
        setFunFactData: useCallback(
            (value) => dispatch({ type: ACTION.SET_FUN_FACT_DATA, payload: value }),
            []
        ),
        setError: useCallback(
            (value) => dispatch({ type: ACTION.SET_ERROR, payload: value }),
            []
        ),
        setCopyStatus: useCallback(
            (value) => dispatch({ type: ACTION.SET_COPY_STATUS, payload: value }),
            []
        ),
    };

    return { state, actions };
}