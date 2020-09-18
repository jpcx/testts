#!/usr/bin/env node
export declare type NonPromise<T> = T extends Promise<any> ? never : T;
export declare type TestBodySync<T> = (test: API) => NonPromise<T>;
export declare type TestBodyAsync<T> = (test: API) => Promise<T>;
export declare type TestBody<T> = TestBodySync<T> | TestBodyAsync<T>;
export declare type Predicate<T extends Array<any>> = (...args: T) => any;
export interface ErrorSub extends Error {
}
export interface ErrorSubConstructor {
    new (...args: any[]): ErrorSub;
    prototype: ErrorSub;
}
export declare type API = typeof test;
export declare const test: {
    <T>(description: string, body: TestBody<T>): Promise<T>;
    throws: {
        (constructor: ErrorSubConstructor, message?: string): API;
        (message: string): API;
        (isCorrectThrow: Predicate<[ErrorSub | any]>): API;
        (): API;
        <T>(description: string, body: TestBody<T>): Promise<T>;
    };
};
