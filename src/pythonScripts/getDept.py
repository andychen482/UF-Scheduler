import json
import os

def test(directory):
    with open(directory) as file:
        data = json.load(file)

    deptNameSet = set()

    for course in data:
        for section in course['sections']:
            deptNameSet.add(section['deptName'])
    
    for element in deptNameSet:
        print(element)
    
    print(f"Number of unique majors: {len(deptNameSet)}")

    deptNameList = list(deptNameSet)

    deptNameList.sort()

    # Extract the file name without the extension
    file_name = "depts"

    # Write the unique courses data into a file with the same name but with '_clean' tag added
    output_folder = '../courses/'
    output_file_name = os.path.join(output_folder, file_name + '_clean.json')
    with open(output_file_name, 'w') as no_dupes_file:
        json.dump(deptNameList, no_dupes_file, indent=4)

test('../courses/UF_Jun-30-2023_23_fall_clean.json')