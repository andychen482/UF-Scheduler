export interface Course {
    [key: string]: string | null;
}

export interface MajorPlans {
    [key: string]: Course[];
}