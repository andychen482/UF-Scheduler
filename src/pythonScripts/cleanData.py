import json
import os

def alphabeticalNoDuplicates(directory):
    # Read the JSON file
    with open(directory) as file:
        data = json.load(file)

    # Initialize the array to store all courses
    all_courses = []

    # Iterate over the data and extract courses
    for item in data:
        courses = item.get('COURSES', [])
        all_courses.extend(courses)

    # Remove duplicate courses based on specified criteria
    unique_courses_set = set()
    for course in all_courses:
        unique_courses_set.add(json.dumps(course, sort_keys=True))

    # Convert the set back to a list of dictionaries
    unique_courses = [json.loads(course) for course in unique_courses_set]

    # Sort the courses by code, name, and termInd
    unique_courses.sort(key=lambda x: (x['code'], x['name'], x['termInd']))

    # Print the number of unique courses
    print(f"Number of unique courses: {len(unique_courses)}")

    # Extract the file name without the extension
    file_name = os.path.splitext(os.path.basename(directory))[0]

    # Write the unique courses data into a file with the same name but with '_clean' tag added
    output_folder = '../courses/'
    output_file_name = os.path.join(output_folder, file_name + '_clean.json')
    with open(output_file_name, 'w') as no_dupes_file:
        json.dump(unique_courses, no_dupes_file, indent=4)


# TODO: Uncomment if you want to use an array instead of a set
# import json
# import os

# def alphabeticalNoDuplicates(directory):
#     # Read the JSON file
#     with open(directory) as file:
#         data = json.load(file)

#     # Initialize the array to store all courses
#     all_courses = []

#     # Iterate over the data and extract courses
#     for item in data:
#         courses = item.get('COURSES', [])
#         all_courses.extend(courses)

#     # Sort the courses by code, name, and termInd
#     all_courses.sort(key=lambda x: (x['code'], x['name'], x['termInd']))

#     # Extract the file name without the extension
#     file_name = os.path.splitext(os.path.basename(directory))[0]

#     # Remove duplicate courses based on specified criteria
#     unique_courses = []
#     for course in all_courses:
#         if course not in unique_courses:
#             unique_courses.append(course)

#     # Print the number of unique courses
#     print(f"Number of unique courses: {len(unique_courses)}")

#     # Write the unique courses data into a file with the same name but with '_clean' tag added
#     output_folder = '../courses/'
#     output_file_name = os.path.join(output_folder, file_name + '_clean.json')
#     with open(output_file_name, 'w') as no_dupes_file:
#         json.dump(unique_courses, no_dupes_file, indent=4)

