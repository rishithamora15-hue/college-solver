// Detailed worked explanations for every aptitude and coding question, keyed by question id (prep-bank.ts).
// Shown only after the student answers, like `why`. Python snippets are runnable and print what their comments say.

export type Explain = { steps: string[]; code: { lang: 'python' | 'java' | 'c' | 'sql' | 'bash' | 'excel' | 'text'; src: string }; trap?: string };

export const EXPLAIN: Record<string, Explain> = {
  // ---------- Aptitude: percentages, profit, interest, averages
  'apt-arith.1': {
    steps: ['Take a starting price of 100: it makes percentages easy to read.', 'Up 20%: 100 + 20 = 120.', 'Down 20% of the NEW price: 20% of 120 = 24, so 120 − 24 = 96.', '96 is 4 less than 100, so the net change is a 4% decrease. Shortcut: a + b + ab/100 = 20 − 20 − 4 = −4.'],
    code: { lang: 'python', src: `price = 100
price = price * 120 / 100   # +20% -> 120.0
price = price * 80 / 100    # -20% -> 96.0
print(price - 100)          # -4.0, a 4% decrease` },
    trap: 'The two 20% changes are taken on different prices (100 and 120), so they do not cancel.',
  },
  'apt-arith.2': {
    steps: ['Profit = selling price − cost price = 500 − 400 = 100.', 'Profit % is measured on the cost price: 100 / 400 × 100.', '= 25%.'],
    code: { lang: 'python', src: `cp, sp = 400, 500
print((sp - cp) / cp * 100)   # 25.0` },
    trap: 'Dividing by the selling price (100 / 500 = 20%) is the most common wrong answer.',
  },
  'apt-arith.3': {
    steps: ['Simple interest = P × R × T / 100.', 'P = 5000, R = 8, T = 3: 5000 × 8 × 3 / 100.', 'Interest is ₹400 every year, so 3 years give ₹1,200.'],
    code: { lang: 'python', src: `p, r, t = 5000, 8, 3
print(p * r * t / 100)   # 1200.0` },
    trap: 'Simple interest is always on the original ₹5,000. It never earns interest on interest.',
  },
  'apt-arith.4': {
    steps: ['Year 1: 10% of 10,000 = 1,000, so the amount becomes 11,000.', 'Year 2: 10% of 11,000 = 1,100, so the amount becomes 12,100.', 'Compound interest = 12,100 − 10,000 = ₹2,100. Formula: P × (1 + R/100)^T − P.'],
    code: { lang: 'python', src: `p, r, t = 10000, 10, 2
amount = p * (1 + r / 100) ** t
print(round(amount - p))   # 2100` },
    trap: '₹2,000 is the simple interest. The extra ₹100 is interest earned in year 2 on year 1 interest.',
  },
  'apt-arith.5': {
    steps: ['Add the ratio parts: 2 + 3 + 5 = 10 parts.', 'One part = 1200 / 10 = ₹120.', 'C has 5 parts: 5 × 120 = ₹600. Check: 240 + 360 + 600 = 1200.'],
    code: { lang: 'python', src: `total, ratio = 1200, [2, 3, 5]
part = total / sum(ratio)
print([part * x for x in ratio])   # [240.0, 360.0, 600.0]` },
  },
  'apt-arith.6': {
    steps: ['Sum of the 5 numbers = 5 × 20 = 100.', 'Sum of the remaining 4 = 4 × 18 = 72.', 'The removed number = 100 − 72 = 28.'],
    code: { lang: 'python', src: `old_sum = 5 * 20
new_sum = 4 * 18
print(old_sum - new_sum)   # 28` },
    trap: 'Work with sums, not averages: subtracting 20 − 18 = 2 means nothing.',
  },
  'apt-arith.7': {
    steps: ['Let the son be s years old; the father is 3s.', 'In 15 years: father 3s + 15, son s + 15, and the father is twice the son: 3s + 15 = 2(s + 15).', '3s + 15 = 2s + 30, so s = 15.', 'Check: today 15 and 45; in 15 years 30 and 60, and 60 = 2 × 30.'],
    code: { lang: 'python', src: `for s in range(1, 100):
    if 3 * s + 15 == 2 * (s + 15):
        print(s)   # 15` },
    trap: 'Add the 15 years to BOTH ages.',
  },
  'apt-arith.8': {
    steps: ['Work from the inside: 40% of 500 = 200.', '15% of 200 = 30.', 'Or multiply the fractions: 0.15 × 0.40 = 0.06, and 6% of 500 = 30.'],
    code: { lang: 'python', src: `print(500 * 40 * 15 / 10000)   # 30.0` },
  },

  // ---------- Aptitude: time, speed and work
  'apt-time.1': {
    steps: ['Passing a pole, the train covers only its own length: 150 m.', 'Speed = 150 / 15 = 10 m/s.', 'Convert to km/h by multiplying by 18/5: 10 × 18/5 = 36 km/h.'],
    code: { lang: 'python', src: `length_m, time_s = 150, 15
mps = length_m / time_s   # 10.0 m/s
print(mps * 18 / 5)       # 36.0 km/h` },
    trap: '10 is the speed in m/s. The question asks for km/h.',
  },
  'apt-time.2': {
    steps: ['Take the job as 30 units (the LCM of 10 and 15).', 'A does 30 / 10 = 3 units a day; B does 30 / 15 = 2 units a day.', 'Together they do 5 units a day, so 30 / 5 = 6 days. With fractions: 1/10 + 1/15 = 1/6 of the job per day.'],
    code: { lang: 'python', src: `from fractions import Fraction
rate = Fraction(1, 10) + Fraction(1, 15)
print(rate, 1 / rate)   # 1/6 6` },
    trap: 'Never average the days ((10 + 15) / 2 = 12.5). Add the rates.',
  },
  'apt-time.3': {
    steps: ['Pick a distance both speeds divide: 120 km each way.', 'Going takes 120 / 60 = 2 h; returning takes 120 / 40 = 3 h.', 'Average speed = total distance / total time = 240 / 5 = 48 km/h. Formula for equal distances: 2ab / (a + b).'],
    code: { lang: 'python', src: `d = 120                         # any distance gives the same answer
total_time = d / 60 + d / 40    # 2 + 3 hours
print(2 * d / total_time)       # 48.0` },
    trap: '(60 + 40) / 2 = 50 is wrong: the car spends more time at the slower speed.',
  },
  'apt-time.4': {
    steps: ['Downstream, the stream helps: 10 + 2 = 12 km/h.', 'Time = distance / speed = 36 / 12 = 3 hours.'],
    code: { lang: 'python', src: `boat, stream, dist = 10, 2, 36
print(dist / (boat + stream))   # 3.0 hours` },
    trap: '4.5 hours uses the upstream speed (10 − 2 = 8 km/h).',
  },
  'apt-time.5': {
    steps: ['Take the tank as 24 units (the LCM of 6 and 8).', 'A fills 24 / 6 = 4 units an hour; B empties 24 / 8 = 3 units an hour.', 'Net filling = 4 − 3 = 1 unit an hour, so 24 hours. With fractions: 1/6 − 1/8 = 1/24.'],
    code: { lang: 'python', src: `from fractions import Fraction
net = Fraction(1, 6) - Fraction(1, 8)
print(net, 1 / net)   # 1/24 24` },
    trap: 'The emptying pipe works against the filling pipe: subtract its rate.',
  },
  'apt-time.6': {
    steps: ['Convert speed: 72 × 5/18 = 20 m/s.', 'Crossing a platform, the train covers its length plus the platform: 200 + 300 = 500 m.', 'Time = 500 / 20 = 25 s.'],
    code: { lang: 'python', src: `speed = 72 * 5 / 18         # 20.0 m/s
print((200 + 300) / speed)  # 25.0 s` },
    trap: 'Using only the platform (15 s) or only the train (10 s) misses part of the distance.',
  },

  // ---------- Aptitude: logical reasoning
  'apt-reason.1': {
    steps: ['Differences: 6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10.', 'The differences grow by 2, so the next difference is 12.', '30 + 12 = 42. Pattern check: each term is n × (n + 1): 1×2, 2×3, …, 6×7 = 42.'],
    code: { lang: 'python', src: `print([n * (n + 1) for n in range(1, 7)])   # [2, 6, 12, 20, 30, 42]` },
  },
  'apt-reason.2': {
    steps: ['Find the rule from CAT: C = 3, A = 1, T = 20, and 3 + 1 + 20 = 24. So the code is the sum of letter positions.', 'DOG: D = 4, O = 15, G = 7.', '4 + 15 + 7 = 26.'],
    code: { lang: 'python', src: `code = lambda word: sum(ord(ch) - ord("A") + 1 for ch in word)
print(code("CAT"), code("DOG"))   # 24 26` },
  },
  'apt-reason.3': {
    steps: ['"The only daughter of my mother" is the woman herself: she has no sister.', 'So the sentence says "His mother is me".', 'The woman is the man\'s mother.'],
    code: { lang: 'python', src: `# Write the relations down as data and follow them
mother_of = {"man": "woman", "woman": "grandmother"}
only_daughter_of = {"grandmother": "woman"}
his_mother = only_daughter_of[mother_of["woman"]]   # the speaker's mother's only daughter
print("mother" if his_mother == mother_of["man"] else "other")   # mother` },
    trap: 'Do not invent a sister. "Only daughter" leaves the speaker as the only choice.',
  },
  'apt-reason.4': {
    steps: ['Use x (east) and y (north). Start at (0, 0).', 'North 10 m: (0, 10). Turning right from north faces east: 5 m to (5, 10).', 'Turning right from east faces south: 10 m to (5, 0).', 'He is 5 m east of the start.'],
    code: { lang: 'python', src: `import math
x, y = 0, 0
y += 10   # north
x += 5    # right turn from north faces east
y -= 10   # right turn from east faces south
print(math.hypot(x, y))   # 5.0` },
  },
  'apt-reason.5': {
    steps: ['Draw the roses circle fully inside the flowers circle.', '"Some flowers fade quickly" only says the fading circle touches the flowers circle somewhere.', 'It can touch flowers that are not roses, so "some roses fade quickly" is possible but not certain: it does not follow.'],
    code: { lang: 'python', src: `# One picture where both statements are true but the conclusion is false
flowers = {"rose", "lily", "tulip"}
roses = {"rose"}            # all roses are flowers
fade_quickly = {"lily"}     # some flowers fade quickly
print(roses <= flowers, bool(flowers & fade_quickly))   # True True
print(bool(roses & fade_quickly))                       # False: the conclusion can fail` },
    trap: 'A conclusion follows only if it is true in EVERY picture that fits the statements.',
  },
  'apt-reason.6': {
    steps: ['Minute hand: 6° per minute, so 15 × 6 = 90°.', 'Hour hand: 30° per hour plus 0.5° per minute: 3 × 30 + 15 × 0.5 = 97.5°.', 'Angle = 97.5 − 90 = 7.5°. Formula: |30H − 5.5M| = |90 − 82.5| = 7.5°.'],
    code: { lang: 'python', src: `h, m = 3, 15
hour_hand = 30 * h + 0.5 * m   # 97.5 degrees
minute_hand = 6 * m            # 90 degrees
print(abs(hour_hand - minute_hand))   # 7.5` },
    trap: '0° assumes the hour hand is still exactly on 3. It has moved a quarter of the way to 4.',
  },
  'apt-reason.7': {
    steps: ['2025 is not a leap year (2025 is not divisible by 4), so it has 365 days.', '365 = 52 × 7 + 1: one extra day.', 'Wednesday + 1 = Thursday.'],
    code: { lang: 'python', src: `import datetime
print(datetime.date(2026, 1, 1).strftime("%A"))   # Thursday` },
    trap: 'A leap year shifts the weekday by 2. Check the year in between before adding.',
  },

  // ---------- Aptitude: probability and counting
  'apt-prob.1': {
    steps: ['Two dice give 6 × 6 = 36 equally likely outcomes.', 'Sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 outcomes.', 'Probability = 6 / 36 = 1/6.'],
    code: { lang: 'python', src: `from fractions import Fraction
hits = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == 7)
print(hits, Fraction(hits, 36))   # 6 1/6` },
    trap: '(1,6) and (6,1) are different outcomes. Counting only 3 pairs gives the wrong 1/12.',
  },
  'apt-prob.2': {
    steps: ['LEVEL has 5 letters: L twice, E twice, V once.', 'If all were different: 5! = 120 arrangements.', 'Swapping the two Ls or the two Es gives the same word, so divide by 2! × 2! = 4: 120 / 4 = 30.'],
    code: { lang: 'python', src: `from itertools import permutations
print(len(set(permutations("LEVEL"))))   # 30` },
  },
  'apt-prob.3': {
    steps: ['A committee has no order: {A, B, C} is the same as {C, B, A}.', 'So use combinations: 5C3 = 5! / (3! × 2!) = 10.', 'Ordered picks would be 5 × 4 × 3 = 60, and each committee is counted 3! = 6 times: 60 / 6 = 10.'],
    code: { lang: 'python', src: `from math import comb, perm
print(comb(5, 3), perm(5, 3))   # 10 60` },
    trap: 'Use permutations only when order or positions matter (president, secretary, treasurer).',
  },
  'apt-prob.4': {
    steps: ['"At least one head" has many cases; its opposite "no heads" has one: TTT.', 'P(TTT) = 1/2 × 1/2 × 1/2 = 1/8.', 'P(at least one head) = 1 − 1/8 = 7/8.'],
    code: { lang: 'python', src: `from itertools import product
outcomes = list(product("HT", repeat=3))
print(sum("H" in o for o in outcomes), len(outcomes))   # 7 8` },
  },

  // ---------- Aptitude: data interpretation
  'apt-di.1': {
    steps: ['Laptops: 60 in 2022, 90 in 2024.', 'Growth = (new − old) / old × 100 = (90 − 60) / 60 × 100.', '= 50%.'],
    code: { lang: 'python', src: `start, end = 60, 90
print((end - start) / start * 100)   # 50.0` },
    trap: 'Divide by the starting year. Dividing by 90 gives 33.3%.',
  },
  'apt-di.2': {
    steps: ['2023 total = mobiles + laptops = 50 + 75 = 125.', 'Mobile share = 50 / 125 × 100.', '= 40%.'],
    code: { lang: 'python', src: `mobiles, laptops = 50, 75
print(mobiles / (mobiles + laptops) * 100)   # 40.0` },
    trap: '50 / 75 compares mobiles with laptops, not with the total.',
  },
  'apt-di.3': {
    steps: ['Mobile sales: 40, 50, 60.', 'Sum = 150; 3 years.', 'Average = 150 / 3 = ₹50 lakh.'],
    code: { lang: 'python', src: `mobiles = [40, 50, 60]
print(sum(mobiles) / len(mobiles))   # 50.0` },
  },
  'apt-di.4': {
    steps: ['A full pie chart is 360° = 100% of the budget.', 'Rent = 72 / 360 = 1/5 = 20%.', '20% of ₹2,00,000 = ₹40,000.'],
    code: { lang: 'python', src: `budget, angle = 200000, 72
print(budget * angle / 360)   # 40000.0` },
  },

  // ---------- Coding: arrays, strings, linked lists, hashing
  'cod-dsa.1': {
    steps: ['Checking every pair is O(n²).', 'For each value x, the partner it needs is target − x. Keep a map of values already seen → their index.', 'If target − x is in the map, you have the answer; otherwise store x and move on. One pass: O(n) time, O(n) extra space.', 'Sorting first is O(n log n) and loses the original indices.'],
    code: { lang: 'python', src: `def two_sum(nums, target):
    seen = {}                        # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:       # check BEFORE storing x
            return [seen[target - x], i]
        seen[x] = i
    return None

print(two_sum([2, 7, 11, 15], 9))   # [0, 1]` },
    trap: 'Storing x before checking lets an element pair with itself (target 4 with a single 2).',
  },
  'cod-dsa.2': {
    steps: ['Push every opening bracket onto a stack.', 'On a closing bracket, the stack top must be its matching opener: pop and compare.', 'At the end the stack must be empty. The last bracket opened must be the first closed, which is exactly last-in, first-out.'],
    code: { lang: 'python', src: `def balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(balanced("({[]})"), balanced("([)]"))   # True False` },
    trap: 'Only counting opening and closing brackets accepts "([)]", which is not balanced.',
  },
  'cod-dsa.3': {
    steps: ['Kadane: walk the array keeping cur = the best sum of a subarray that ends here.', 'At each x: cur = max(x, cur + x) (extend the run, or restart at x). Track best = max(best, cur).', 'Trace: cur goes −2, 1, −2, 4, 3, 5, 6, 1, 5. The best is 6, from [4, −1, 2, 1].', 'One pass: O(n) time, O(1) space.'],
    code: { lang: 'python', src: `def max_subarray(nums):
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)   # extend the run or restart at x
        best = max(best, cur)
    return best

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))   # 6` },
    trap: 'Starting best at 0 gives a wrong answer when every number is negative.',
  },
  'cod-dsa.4': {
    steps: ['Move slow one step and fast two steps at a time.', 'Without a cycle, fast reaches the end (None).', 'With a cycle, fast gains one node per step inside the loop, so it must land on slow: they meet.', 'Only two pointers: O(1) extra space, O(n) time. A visited set also works but uses O(n) space.'],
    code: { lang: 'python', src: `class Node:
    def __init__(self, val):
        self.val, self.next = val, None

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next         # 1 step
        fast = fast.next.next    # 2 steps
        if slow is fast:
            return True
    return False

a, b, c = Node(1), Node(2), Node(3)
a.next, b.next, c.next = b, c, a   # 3 points back to 1
print(has_cycle(a))   # True` },
  },
  'cod-dsa.5': {
    steps: ['Keep three pointers: prev (starts as None), the current node, and next.', 'For each node: remember next, point the node back at prev, then move prev and current forward.', 'Each node is visited once: O(n) time. Only three pointers: O(1) extra space.', 'The recursive version is also O(n) time but uses O(n) stack space.'],
    code: { lang: 'python', src: `class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def reverse(head):
    prev = None
    while head:
        nxt = head.next    # remember the rest
        head.next = prev   # flip the pointer
        prev, head = head, nxt
    return prev

node = reverse(Node(1, Node(2, Node(3))))
while node:
    print(node.val)   # 3, then 2, then 1
    node = node.next` },
    trap: 'Save head.next before flipping it, or the rest of the list is lost.',
  },
  'cod-dsa.6': {
    steps: ['The array has n − 1 numbers, so n = length + 1.', 'The full sum 1 + 2 + … + n = n(n + 1)/2.', 'Missing number = full sum − actual sum. One pass, no extra memory.', 'In C or Java use long for the sum (or XOR all numbers) so large n does not overflow.'],
    code: { lang: 'python', src: `def missing(nums):
    n = len(nums) + 1   # one number is missing
    return n * (n + 1) // 2 - sum(nums)

print(missing([1, 2, 4, 5, 6]))   # 3` },
    trap: 'Using n = len(nums) forgets that one number is missing.',
  },
  'cod-dsa.7': {
    steps: ['Anagrams use the same letters the same number of times.', 'Count each character in both strings (a hash map, or an int[26] for lowercase letters) and compare the counts: O(n).', 'Sorting both strings and comparing also works, but costs O(n log n).'],
    code: { lang: 'python', src: `from collections import Counter

def is_anagram(a, b):
    return len(a) == len(b) and Counter(a) == Counter(b)

print(is_anagram("listen", "silent"), is_anagram("rat", "car"))   # True False` },
  },

  // ---------- Coding: searching, sorting, complexity
  'cod-algo.1': {
    steps: ['Look at the middle element of a sorted range.', 'If it is the target, stop. If it is smaller, the target can only be on the right; if larger, only on the left.', 'Each step halves the range, so a million items need at most about 20 steps: O(log n).', 'It needs sorted data: on unsorted data, throwing half away is not safe.'],
    code: { lang: 'python', src: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2   # avoids overflow in C/Java
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1            # target is in the right half
        else:
            hi = mid - 1            # target is in the left half
    return -1

print(binary_search([3, 8, 15, 23, 42, 57], 23))   # 3` },
  },
  'cod-algo.2': {
    steps: ['Quick sort picks a pivot and splits the rest into smaller and larger parts.', 'With a good pivot the parts are about half each: O(n log n).', 'If the pivot is always the smallest or largest (a sorted array with the first element as pivot), one part is empty and the other has n − 1 items.', 'Work = (n − 1) + (n − 2) + … + 1 = n(n − 1)/2: O(n²). Random or median-of-three pivots avoid this in practice.'],
    code: { lang: 'python', src: `def quicksort(a, stats):
    if len(a) <= 1:
        return a
    pivot, rest = a[0], a[1:]           # first element as pivot
    stats["comparisons"] += len(rest)
    left = [x for x in rest if x < pivot]
    right = [x for x in rest if x >= pivot]
    return quicksort(left, stats) + [pivot] + quicksort(right, stats)

stats = {"comparisons": 0}
quicksort(list(range(100)), stats)   # already sorted: the worst case
print(stats["comparisons"])          # 4950 = 100 * 99 / 2` },
  },
  'cod-algo.3': {
    steps: ['Merge sort splits the array in half until pieces have one item: about log n levels.', 'Each level merges all n items once, so the total is O(n log n) for every input: best, average and worst.', 'When two items are equal it takes the left one first, so equal items keep their original order: it is stable.', 'Heap sort is O(n log n) but not stable; quick sort can fall to O(n²).'],
    code: { lang: 'python', src: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:   # <= keeps equal items in order: stable
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]

print(merge_sort([5, 2, 9, 1, 5, 6]))   # [1, 2, 5, 5, 6, 9]` },
    trap: 'Merge sort pays for its guarantee with O(n) extra memory.',
  },
  'cod-algo.4': {
    steps: ['fib(n) calls fib(n − 1) and fib(n − 2), and each of those calls two more.', 'The same values are recomputed again and again: the call tree roughly doubles with n, so O(2ⁿ).', 'Remember each answer (memoisation) or loop from the bottom up, and every value is computed once: O(n).'],
    code: { lang: 'python', src: `from functools import lru_cache

calls = 0
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(20)
print(calls)   # 21891 calls just for n = 20

@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

print(fib_memo(90))   # 2880067194370816120, instantly` },
  },
  'cod-algo.5': {
    steps: ['BFS explores in layers: all nodes 1 edge away, then 2 edges away, and so on, using a queue.', 'So the first time BFS reaches a node, it has used the fewest possible edges.', 'DFS dives down one branch first and can reach the goal by a longer route.', 'For weighted edges use Dijkstra instead.'],
    code: { lang: 'python', src: `from collections import deque

def fewest_edges(graph, start, goal):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            return dist[node]
        for nxt in graph[node]:
            if nxt not in dist:          # first visit = fewest edges
                dist[nxt] = dist[node] + 1
                queue.append(nxt)
    return -1

graph = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": ["E"], "E": []}
print(fewest_edges(graph, "A", "E"))   # 2 (A -> C -> E); DFS might return A -> B -> D -> E` },
  },
  'cod-algo.6': {
    steps: ['A hash function turns the key into an array index (a bucket).', 'Looking up a key jumps straight to its bucket: O(1) on average, whatever the map size.', 'If many keys collide in one bucket, the lookup scans them: O(n) worst case. Java 8+ turns crowded buckets into trees, giving O(log n).'],
    code: { lang: 'python', src: `phone = {"asha": "98xxxx1201", "ravi": "98xxxx4410"}
print(phone["ravi"])      # 98xxxx4410, found by hashing "ravi"
print("meera" in phone)   # False, also O(1) on average` },
  },

  // ---------- Coding: predict the output
  'cod-output.1': {
    steps: ['Java evaluates + from left to right.', '10 + 20: both ints, so 30.', '30 + "Hi": a String is involved, so it becomes "30Hi". From now on + joins text.', '"30Hi" + 10 = "30Hi10", then + 20 = "30Hi1020".'],
    code: { lang: 'java', src: `System.out.println(10 + 20 + "Hi" + 10 + 20);     // 30Hi1020
System.out.println(10 + 20 + "Hi" + (10 + 20));   // 30Hi30: brackets add first
System.out.println("Hi" + 10 + 20);               // Hi1020` },
  },
  'cod-output.2': {
    steps: ['The ; right after for (...) is an empty statement: it is the whole loop body.', 'The loop just counts i from 0 up and stops when i < 5 is false, so i = 5.', 'printf is not inside the loop: it runs once and prints 5.'],
    code: { lang: 'c', src: `int i;
for (i = 0; i < 5; i++);   /* this ; is the whole loop body */
printf("%d", i);           /* runs once, after the loop: 5 */

/* What was probably meant: */
for (i = 0; i < 5; i++) {
    printf("%d", i);       /* 01234 */
}` },
    trap: 'Always use braces with loops; compilers can warn about a misleading ; (-Wempty-body).',
  },
  'cod-output.3': {
    steps: ['For lists, * means repeat, not multiply each item.', '[1, 2, 3] * 2 joins two copies: [1, 2, 3, 1, 2, 3].', 'To double each item use a list comprehension.'],
    code: { lang: 'python', src: `print([1, 2, 3] * 2)                # [1, 2, 3, 1, 2, 3]
print([x * 2 for x in [1, 2, 3]])   # [2, 4, 6]
print([[1, 2, 3]] * 2)              # [[1, 2, 3], [1, 2, 3]]` },
  },
  'cod-output.4': {
    steps: ['s[::-1] uses a step of −1, which reverses the string: "tnemecalp".', '[:3] takes the first three characters of that: "tne".', 'Same result: the last three characters "ent", reversed.'],
    code: { lang: 'python', src: `s = "placement"
print(s[::-1])        # tnemecalp
print(s[::-1][:3])    # tne
print(s[-3:][::-1])   # tne` },
  },
  'cod-output.5': {
    steps: ['x++ is post-increment: the expression uses the OLD value 5, then x becomes 6.', 'So y = 5 + 10 = 15.', 'The print shows x = 6 and y = 15: "6 15". With ++x (pre-increment) y would be 16.'],
    code: { lang: 'java', src: `int x = 5;
int y = x++ + 10;   // uses 5, then x becomes 6
System.out.println(x + " " + y);   // 6 15

int a = 5;
int b = ++a + 10;   // a becomes 6 first
System.out.println(a + " " + b);   // 6 16` },
  },
  'cod-output.6': {
    steps: ['7 and 2 are both int, so / is integer division.', 'Integer division throws away the fraction (truncates toward zero): 7 / 2 = 3.', 'Make one operand a double to get 3.5; use % for the remainder.'],
    code: { lang: 'c', src: `printf("%d", 7 / 2);       /* 3    int / int truncates */
printf("%.1f", 7 / 2.0);   /* 3.5  one double operand */
printf("%d", 7 % 2);       /* 1    the remainder */` },
    trap: 'printf("%d", 7 / 2.0) is undefined behaviour: the format must match the type (double needs %f).',
  },

  // ---------- Coding: OOP
  'cod-oop.1': {
    steps: ['Overriding: a subclass gives its own version of a parent method with the same signature.', 'A parent-type reference can hold a child object. Which version runs is decided at RUNTIME from the actual object.', 'That is runtime (dynamic) polymorphism. Overloading is decided at compile time.'],
    code: { lang: 'java', src: `class Animal { String sound() { return "..."; } }
class Dog extends Animal {
    @Override String sound() { return "Woof"; }
}

Animal a = new Dog();            // reference type Animal, object type Dog
System.out.println(a.sound());   // Woof: chosen at runtime from the object` },
  },
  'cod-oop.2': {
    steps: ['Java allows exactly one superclass (extends), which avoids the diamond problem for state.', 'A class can implement any number of interfaces.', 'Interfaces have no constructors; abstract classes CAN contain implemented methods; since Java 8 interfaces can have default methods too.'],
    code: { lang: 'java', src: `interface Printable { void print(); }
interface Scannable { void scan(); }
class Device { }

class Printer extends Device implements Printable, Scannable {   // one class, many interfaces
    public void print() { System.out.println("printing"); }
    public void scan()  { System.out.println("scanning"); }
}
// class Bad extends Device, Printer { }   // compile error: only one superclass` },
  },
  'cod-oop.3': {
    steps: ['Encapsulation bundles data with the methods that use it, and hides the data.', 'Fields are private; other classes go through public methods.', 'The methods can validate every change, so the object can never get into an invalid state.'],
    code: { lang: 'java', src: `class Account {
    private double balance;              // hidden: no direct access

    public double getBalance() { return balance; }

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");
        balance += amount;               // every change goes through a check
    }
}` },
    trap: 'Abstraction hides HOW something works; encapsulation hides the DATA. Interviewers often ask for the difference.',
  },
  'cod-oop.4': {
    steps: ['Same method name, different parameter lists, in the same class: overloading.', 'The compiler picks the version from the argument types, so it is compile-time polymorphism.', 'A different return type alone is not enough to overload.'],
    code: { lang: 'java', src: `class Calc {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
}

Calc c = new Calc();
System.out.println(c.add(2, 3));       // 5    -> add(int, int)
System.out.println(c.add(2.5, 3.0));   // 5.5  -> add(double, double)` },
  },

  // ---------- Coding: SQL and DBMS
  'cod-sql.1': {
    steps: ['The inner query finds the highest salary.', 'The outer query keeps only salaries below it and takes their MAX: that is the second highest.', 'DENSE_RANK() does the same and also works for the Nth highest; it handles ties correctly.'],
    code: { lang: 'sql', src: `-- Highest salary below the maximum
SELECT MAX(salary) AS second_highest
FROM Employee
WHERE salary < (SELECT MAX(salary) FROM Employee);

-- Nth highest with a window function (here N = 2)
SELECT DISTINCT salary
FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM Employee) t
WHERE rnk = 2;` },
    trap: 'ORDER BY salary DESC LIMIT 1 OFFSET 1 returns the top salary again if two people share it. Add DISTINCT.',
  },
  'cod-sql.2': {
    steps: ['A query runs in this order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.', 'WHERE filters single rows before grouping, so it cannot use COUNT(*) or other aggregates.', 'HAVING filters whole groups after GROUP BY, so it can.'],
    code: { lang: 'sql', src: `SELECT branch, COUNT(*) AS students
FROM Student
WHERE cgpa >= 6          -- row filter, before grouping
GROUP BY branch
HAVING COUNT(*) > 30;    -- group filter, after grouping` },
  },
  'cod-sql.3': {
    steps: ['DELETE removes the rows you choose with WHERE (or all rows) and is logged row by row.', 'TRUNCATE removes every row at once, keeps the table, and is much faster. It takes no WHERE.', 'DROP removes the table itself: structure and data.'],
    code: { lang: 'sql', src: `DELETE FROM Orders WHERE status = 'cancelled';  -- chosen rows
TRUNCATE TABLE Orders;                         -- every row; the table stays
DROP TABLE Orders;                             -- the table is gone` },
    trap: 'TRUNCATE commits immediately in MySQL and Oracle, so it cannot be rolled back there. PostgreSQL allows it inside a transaction.',
  },
  'cod-sql.4': {
    steps: ['LEFT JOIN keeps every row of the left table (Students).', 'Where a student has a matching row in Marks, its columns are filled in.', 'Where there is no match, the Marks columns are NULL, but the student still appears.'],
    code: { lang: 'sql', src: `SELECT s.name, m.marks
FROM Students s
LEFT JOIN Marks m ON m.student_id = s.id;
-- Asha | 82
-- Ravi | NULL    <- no row in Marks, but Ravi is still listed` },
    trap: 'A condition on the right table in WHERE (m.marks > 50) drops the NULL rows and turns it into an inner join. Put it in ON instead.',
  },
  'cod-sql.5': {
    steps: ['COUNT(*) counts rows, whatever they contain: 10.', 'COUNT(column) counts only rows where that column is not NULL.', '10 rows − 3 NULL emails = 7.'],
    code: { lang: 'sql', src: `SELECT COUNT(*)     FROM Users;              -- 10: every row
SELECT COUNT(email) FROM Users;              -- 7: NULL emails are skipped
SELECT COUNT(*) - COUNT(email) FROM Users;   -- 3: rows with no email` },
  },
  'cod-sql.6': {
    steps: ['ACID = Atomicity, Consistency, Isolation, Durability.', 'Isolation: transactions running at the same time do not see each other\'s unfinished changes. The result is as if they ran one after another.', 'Databases offer isolation levels (Read Committed, Repeatable Read, Serializable) that trade strictness for speed.'],
    code: { lang: 'sql', src: `BEGIN;
UPDATE Account SET balance = balance - 500 WHERE id = 1;
UPDATE Account SET balance = balance + 500 WHERE id = 2;
COMMIT;
-- Atomicity: both updates happen, or neither does.
-- Isolation: no other session sees the ₹500 "in flight"
--            (taken from account 1 but not yet added to account 2).` },
  },

  // ---------- Coding: OS, networks, Git
  'cod-core.1': {
    steps: ['A deadlock needs all four Coffman conditions at once: mutual exclusion, hold and wait, no preemption, circular wait.', 'Break any one and deadlock cannot happen. The usual fix is a fixed lock order, which breaks circular wait.', 'Starvation is different: a process waits forever because others keep getting the resource, even though the system keeps working.'],
    code: { lang: 'python', src: `import threading

a, b = threading.Lock(), threading.Lock()

def task_1():
    with a:        # holds A ...
        with b:    # ... and waits for B
            pass

def task_2():
    with b:        # holds B ...
        with a:    # ... and waits for A: circular wait, so a deadlock is possible
            pass

# Fix: make every task take the locks in the same order (a, then b).` },
  },
  'cod-core.2': {
    steps: ['Each process has its own memory space.', 'Threads inside one process share that memory (code, heap, globals); each thread has only its own stack and registers.', 'Sharing makes threads cheap and fast to communicate, but two threads updating the same data need a lock.'],
    code: { lang: 'python', src: `import threading

counter = 0
lock = threading.Lock()

def work():
    global counter
    for _ in range(100_000):
        with lock:        # shared memory needs a lock
            counter += 1

threads = [threading.Thread(target=work) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)   # 400000: all four threads updated the same variable` },
  },
  'cod-core.3': {
    steps: ['TCP first sets up a connection (the three-way handshake: SYN, SYN-ACK, ACK).', 'It numbers every segment, acknowledges what arrives and resends what is lost, so data arrives complete and in order.', 'UDP just sends datagrams with no connection or guarantee: faster, used for video calls, games and DNS.'],
    code: { lang: 'python', src: `import socket

tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)   # TCP: connect, then a reliable ordered stream
udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)    # UDP: separate datagrams, no delivery guarantee
print(tcp.type.name, udp.type.name)   # SOCK_STREAM SOCK_DGRAM
tcp.close(); udp.close()` },
  },
  'cod-core.4': {
    steps: ['git fetch downloads new commits from the remote but does not touch your files.', 'git merge then combines those commits into your current branch.', 'git pull does both in one command. git pull --rebase replays your commits on top instead of making a merge commit.'],
    code: { lang: 'bash', src: `git fetch origin            # download new commits; your files do not change
git merge origin/main       # combine them into your current branch
git pull origin main        # both steps at once
git pull --rebase origin main   # fetch, then replay your commits on top` },
  },
  'cod-core.5': {
    steps: ['DNS: the browser (after checking its caches) asks a DNS resolver for the server\'s IP address.', 'TCP handshake with that IP, then a TLS handshake for https.', 'The browser sends the HTTP request; the server sends back HTML.', 'The browser parses the HTML, fetches CSS, JS and images, and renders the page.'],
    code: { lang: 'python', src: `import socket
# Step 1 of opening https://example.com: turn the name into an IP address
print(socket.gethostbyname("example.com"))   # prints the server's IPv4 address` },
  },

  // ---------- Coding: software testing
  'cod-testing.1': {
    steps: ['Bugs cluster at the edges of ranges (an off-by-one like > instead of >=).', 'Boundary value analysis tests each edge and the value just outside it.', 'For 18 to 60: 17 (invalid), 18 (valid), 60 (valid), 61 (invalid).'],
    code: { lang: 'python', src: `def valid_age(age):
    return 18 <= age <= 60

for age in [17, 18, 60, 61]:     # each edge and one step outside it
    print(age, valid_age(age))   # 17 False / 18 True / 60 True / 61 False` },
  },
  'cod-testing.2': {
    steps: ['A fix in one place can break something that used to work elsewhere: a regression.', 'Regression testing re-runs the existing tests after every change.', 'Automating these tests (for example with pytest or JUnit in CI) makes it cheap to run them every time.'],
    code: { lang: 'python', src: `# test_discount.py, run with: pytest
def discount(total):
    return total * 0.9 if total >= 1000 else total

def test_big_order_gets_discount():   # the bug that was just fixed
    assert discount(1000) == 900

def test_small_order_unchanged():     # older test: re-run it to catch a regression
    assert discount(500) == 500` },
  },
  'cod-testing.3': {
    steps: ['Severity = how badly the bug breaks the system (set by the tester).', 'Priority = how soon it must be fixed (set with the business).', 'A misspelt company name breaks nothing (low severity) but every visitor sees it (high priority).', 'The opposite: a crash in a rarely used admin export is high severity, lower priority.'],
    code: { lang: 'text', src: `Title:     Company name misspelt on the home page ("Vigan" instead of "Vignan")
Severity:  Low   - no feature is broken, no data is wrong
Priority:  High  - every visitor sees it; fix it in this release` },
  },
  'cod-testing.4': {
    steps: ['Black-box testing uses only the specification: inputs and expected outputs.', 'The tester does not read the code. Techniques: equivalence partitioning, boundary values, decision tables.', 'White-box testing reads the code to cover its branches and paths.'],
    code: { lang: 'python', src: `def is_valid_email(text):   # the code under test: a black-box tester never reads this
    return "@" in text and "." in text.split("@")[-1]

# Black-box cases come from the specification only
cases = [("", False), ("a@b.com", True), ("no-at-sign", False)]
for text, expected in cases:
    print(repr(text), is_valid_email(text) == expected)   # each line ends with True` },
  },
  'cod-testing.5': {
    steps: ['The developer must be able to see the bug happen.', 'So give exact steps to reproduce, the expected result and the actual result.', 'Add the environment (browser, OS, build), how often it happens, and evidence such as a screenshot or log.'],
    code: { lang: 'text', src: `Title:    Sign-in fails when the password contains "&"
Steps:    1. Open /signin  2. Email: test@college.edu  3. Password: abc&1234  4. Click Sign in
Expected: Signed in; the dashboard opens
Actual:   "Email or password is incorrect"
Env:      Chrome 130, Windows 11, build 2.4.1
Evidence: screenshot attached; happens every time` },
  },
  'cod-testing.6': {
    steps: ['Verification: "Are we building the product right?" It checks documents and code against the spec without running the product: reviews, walkthroughs, inspections.', 'Validation: "Are we building the right product?" It runs the product and checks it meets user needs: system testing, user acceptance testing.', 'Reviewing requirements and design before any code runs is verification.'],
    code: { lang: 'text', src: `Verification (no execution)       Validation (run the product)
- requirements review              - system testing
- design walkthrough               - user acceptance testing
- code inspection                  - beta testing` },
  },

  // ---------- Coding: statistics and Python for data
  'cod-stats.1': {
    steps: ['Mean = sum / count = 6,33,000 / 5 = 1,26,600: no one in the team earns close to that.', 'Median = the middle value after sorting = 35,000.', 'One outlier (5 lakh) pulls the mean but barely moves the median, so the median describes a typical salary.'],
    code: { lang: 'python', src: `import statistics
salaries = [30_000, 32_000, 35_000, 36_000, 500_000]
print(statistics.mean(salaries))     # 126600: pulled up by one outlier
print(statistics.median(salaries))   # 35000: the typical salary` },
  },
  'cod-stats.2': {
    steps: ['groupby("branch") splits the rows into one group per branch.', '["marks"] picks the column to summarise.', '.mean() aggregates each group. Swap in .sum(), .count() or .agg(["mean", "max"]) as needed.'],
    code: { lang: 'python', src: `import pandas as pd
df = pd.DataFrame({"branch": ["CSE", "ECE", "CSE", "ECE"], "marks": [80, 70, 90, 60]})
print(df.groupby("branch")["marks"].mean())
# CSE    85.0
# ECE    65.0` },
  },
  'cod-stats.3': {
    steps: ['Both numbers rise together: they are correlated.', 'But eating ice cream does not cause drowning. Hot weather (a confounding variable) drives both: more ice cream and more swimming.', 'To claim cause you need a controlled experiment or a careful study that accounts for confounders.'],
    code: { lang: 'python', src: `import statistics
ice_cream = [20, 35, 50, 65, 80]   # rises with temperature
drownings = [2, 3, 5, 6, 8]        # also rises with temperature
print(round(statistics.correlation(ice_cream, drownings), 2))   # 0.99: strong, yet neither causes the other` },
  },
  'cod-stats.4': {
    steps: ['df.isna() returns a True/False table: True where a value is missing (NaN or None).', 'True counts as 1, so .sum() adds them up per column.', 'df.isna().sum().sum() gives the total for the whole table.'],
    code: { lang: 'python', src: `import pandas as pd
df = pd.DataFrame({"name": ["Asha", "Ravi", None], "cgpa": [8.1, None, None]})
print(df.isna().sum())
# name    1
# cgpa    2` },
  },

  // ---------- Coding: Excel and business tools
  'cod-excel.1': {
    steps: ['VLOOKUP searches down the FIRST column of a table for a value.', 'It returns the value from the column number you give, in the same row.', 'Use FALSE as the last argument for an exact match. Newer Excel has XLOOKUP, which can look up in any column.'],
    code: { lang: 'excel', src: `=VLOOKUP(E2, A2:C100, 3, FALSE)
  E2        the value to find (for example a roll number)
  A2:C100   the table; E2 is searched in its first column (A)
  3         return the value from the 3rd column of the table (C)
  FALSE     exact match only

=XLOOKUP(E2, A2:A100, C2:C100)   newer Excel: any lookup column` },
    trap: 'Without FALSE, VLOOKUP does an approximate match and can silently return the wrong row.',
  },
  'cod-excel.2': {
    steps: ['SUMIF(range to test, condition, range to add).', 'Range to test = Region (B:B), condition = "South", range to add = Amount (C:C).', 'For several conditions use SUMIFS, where the range to add comes FIRST.'],
    code: { lang: 'excel', src: `=SUMIF(B:B, "South", C:C)                 total Amount where Region is South
=SUMIFS(C:C, B:B, "South", D:D, "2024")   several conditions: the sum range comes first
=COUNTIF(B:B, "South")                    how many South rows` },
  },
  'cod-excel.3': {
    steps: ['A plain reference like A1 is relative: copied one row down it becomes A2.', '$ locks what follows it: $A$1 locks both column and row, so it never changes when copied.', '$A1 locks only the column; A$1 locks only the row. Press F4 to cycle through them.'],
    code: { lang: 'excel', src: `Tax rate in F1, amounts in B2:B50.
In C2 type   =B2*$F$1   and fill down:
C3 becomes   =B3*$F$1   (B moves, $F$1 stays)
Without $:   =B3*F2     (wrong: F2 is empty)` },
  },
  'cod-excel.4': {
    steps: ['ROI = (return − cost) / cost × 100.', '(80,000 − 50,000) / 50,000 = 30,000 / 50,000.', '= 0.6 = 60%.'],
    code: { lang: 'excel', src: `Cost in B1 (50000), return in B2 (80000):
=(B2-B1)/B1      then format the cell as %  ->  60%` },
    trap: '80,000 / 50,000 = 160% is the return as a share of cost, not the gain. Dividing by the return gives 37.5%.',
  },
  'cod-excel.5': {
    steps: ['A pivot table summarises a table by dragging fields, with no formulas.', 'Put Region in Rows, Month in Columns and Sales in Values (Sum).', 'When the data changes, click Refresh.'],
    code: { lang: 'text', src: `1. Click any cell in the data, then Insert > PivotTable > New worksheet
2. Drag Region to Rows, Month to Columns, Sales to Values (Sum of Sales)
3. Data changed? PivotTable Analyze > Refresh

One cell with a formula instead:  =SUMIFS(D:D, B:B, "South", C:C, "Jan")` },
  },
};
