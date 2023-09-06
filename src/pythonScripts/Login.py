from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Start a new browser session
driver = webdriver.Chrome()  # or webdriver.Firefox() if you're using Firefox

# Navigate to the website
driver.get("https://one.uf.edu/shib/login")

# Fill in the login form
username_elem = driver.find_element(By.NAME, "j_username")
password_elem = driver.find_element(By.NAME, "j_password")

username_elem.send_keys("andy.chen")
password_elem.send_keys("@k#k4i?M#V4AV/@")

# Submit the form
submit_button = driver.find_element(By.NAME, "_eventId_proceed")
submit_button.click()

# At this point, the Duo authentication will be triggered. 
# You'll need to manually handle the Duo prompt or use Selenium's capabilities to interact with it.

# Wait for Duo authentication to complete (this might need adjustments based on your actual flow)
time.sleep(10)  # Wait for 30 seconds, adjust as needed

driver.get("https://one.uf.edu/myschedule/")

print(driver.page_source)

view_schedule = driver.find_element(By.CLASS_NAME, "MuiButton-outlinedPrimary")

view_schedule.click()

# Continue with other actions, e.g., navigate to another page
driver.get("https://one.uf.edu/api/myschedule/course-search?ai=false&auf=false&category=CWSP&class-num=&course-code=COP&course-title=&cred-srch=&credits=&day-f=&day-m=&day-r=&day-s=&day-t=&day-w=&dept=&eep=&fitsSchedule=false&ge=&ge-b=&ge-c=&ge-d=&ge-h=&ge-m=&ge-n=&ge-p=&ge-s=&instructor=&last-control-number=0&level-max=&level-min=&no-open-seats=false&online-a=&online-c=&online-h=&online-p=&period-b=&period-e=&prog-level=&qst-1=&qst-2=&qst-3=&quest=false&term=2238&wr-2000=&wr-4000=&wr-6000=&writing=false&var-cred=&hons=false")

print(driver.page_source)
# Close the browser session
driver.quit()
