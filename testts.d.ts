#!/usr/bin/env node
export declare type TestBodySync<T> = (test: TestAPI) => T;
export declare type TestBodyAsync<T> = (test: TestAPI) => Promise<T>;
export declare type TestBody<T> = TestBodySync<T> | TestBodyAsync<T>;
export declare type Predicate<T extends Array<any>> = (...args: T) => any;
export interface ErrorSub extends Error {
}
export interface ErrorSubConstructor {
    new (...args: any[]): ErrorSub;
    prototype: ErrorSub;
}
export declare type TestAPI = typeof test;
export declare const test: {
    <T>(description: string, body: TestBody<T>): Promise<T>;
    throws: {
        (constructor: ErrorSubConstructor, message?: string): TestAPI;
        (message: string): TestAPI;
        (isCorrectThrow: Predicate<[ErrorSub | any]>): TestAPI;
        (): TestAPI;
        <T>(description: string, body: TestBody<T>): Promise<T>;
    };
    deleteStacks(setting?: boolean, passToChildren?: boolean): void;
    priority(setting?: number): void;
};
