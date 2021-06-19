#!/usr/bin/env node
export declare type TestBodySync<T> = (test: TestRegistrar) => T;
export declare type TestBodyAsync<T> = (test: TestRegistrar) => Promise<T>;
export declare type TestBody<T> = TestBodySync<T> | TestBodyAsync<T>;
export declare type Predicate<T extends Array<any>> = (...args: T) => any;
export declare type Settings = {
    prioritized: string[];
};
export interface ErrorSub extends Error {
}
export interface ErrorSubConstructor {
    new (...args: any[]): ErrorSub;
    prototype: ErrorSub;
}
export declare type TestRegistrar = typeof test;
export declare const test: {
    <T>(description: string, body: TestBody<T>): Promise<T>;
    throws: {
        (constructor: ErrorSubConstructor, message?: string): TestRegistrar;
        (message: string): TestRegistrar;
        (isCorrectThrow: Predicate<[ErrorSub | any]>): TestRegistrar;
        (): TestRegistrar;
        <T>(description: string, body: TestBody<T>): Promise<T>;
    };
    deleteStacks(setting?: boolean, passToChildren?: boolean): void;
};
